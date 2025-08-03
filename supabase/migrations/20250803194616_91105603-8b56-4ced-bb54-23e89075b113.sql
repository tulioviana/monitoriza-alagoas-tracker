-- FASE 1: Fundação do Banco de Dados para Sistema de Monitoramento
-- Criação das tabelas principais: tracked_items, price_history, monitoring_preferences

-- 1. Tabela de itens monitorados pelo usuário
CREATE TABLE public.tracked_items (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('produto', 'combustivel')),
    search_criteria JSONB NOT NULL,
    nickname TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_updated_at TIMESTAMPTZ,
    last_price NUMERIC(10, 2),
    price_trend TEXT CHECK (price_trend IN ('up', 'down', 'stable')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de histórico de preços
CREATE TABLE public.price_history (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    tracked_item_id BIGINT NOT NULL REFERENCES public.tracked_items(id) ON DELETE CASCADE,
    fetch_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sale_price NUMERIC(10, 2) NOT NULL,
    declared_price NUMERIC(10, 2),
    establishment_name TEXT,
    establishment_cnpj TEXT,
    establishment_address JSONB,
    api_response_metadata JSONB,
    price_change_percent NUMERIC(5, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela de preferências de monitoramento
CREATE TABLE public.monitoring_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    update_frequency_minutes INTEGER NOT NULL DEFAULT 30 CHECK (update_frequency_minutes >= 5),
    max_items_per_user INTEGER NOT NULL DEFAULT 50,
    enable_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    price_change_threshold NUMERIC(5, 2) DEFAULT 5.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativar Row-Level Security em todas as tabelas
ALTER TABLE public.tracked_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tracked_items
CREATE POLICY "Users can manage their own tracked items"
ON public.tracked_items
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para price_history
CREATE POLICY "Users can view price history of their tracked items"
ON public.price_history
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tracked_items
        WHERE tracked_items.id = price_history.tracked_item_id
        AND tracked_items.user_id = auth.uid()
    )
);

-- Políticas RLS para monitoring_preferences
CREATE POLICY "Users can manage their own monitoring preferences"
ON public.monitoring_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_tracked_items_user_id ON public.tracked_items(user_id);
CREATE INDEX idx_tracked_items_active ON public.tracked_items(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_tracked_items_last_updated ON public.tracked_items(last_updated_at);
CREATE INDEX idx_price_history_tracked_item_id ON public.price_history(tracked_item_id);
CREATE INDEX idx_price_history_fetch_date ON public.price_history(fetch_date DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tracked_items_updated_at
    BEFORE UPDATE ON public.tracked_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monitoring_preferences_updated_at
    BEFORE UPDATE ON public.monitoring_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Função para calcular tendência de preço
CREATE OR REPLACE FUNCTION public.calculate_price_trend(
    p_tracked_item_id BIGINT,
    p_new_price NUMERIC
) RETURNS TEXT AS $$
DECLARE
    v_last_price NUMERIC;
    v_trend TEXT;
BEGIN
    -- Buscar o último preço registrado
    SELECT sale_price INTO v_last_price
    FROM public.price_history
    WHERE tracked_item_id = p_tracked_item_id
    ORDER BY fetch_date DESC
    LIMIT 1;
    
    -- Se não há preço anterior, retorna 'stable'
    IF v_last_price IS NULL THEN
        RETURN 'stable';
    END IF;
    
    -- Calcular tendência com base na diferença percentual
    IF p_new_price > v_last_price * 1.01 THEN -- Mais de 1% de aumento
        v_trend := 'up';
    ELSIF p_new_price < v_last_price * 0.99 THEN -- Mais de 1% de diminuição
        v_trend := 'down';
    ELSE
        v_trend := 'stable';
    END IF;
    
    RETURN v_trend;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar itens que precisam de atualização
CREATE OR REPLACE FUNCTION public.get_items_needing_update()
RETURNS TABLE (
    item_id BIGINT,
    user_id UUID,
    item_type TEXT,
    search_criteria JSONB,
    nickname TEXT,
    update_frequency_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ti.id,
        ti.user_id,
        ti.item_type,
        ti.search_criteria,
        ti.nickname,
        COALESCE(mp.update_frequency_minutes, 30) as update_frequency_minutes
    FROM public.tracked_items ti
    LEFT JOIN public.monitoring_preferences mp ON ti.user_id = mp.user_id
    WHERE ti.is_active = TRUE
    AND (
        ti.last_updated_at IS NULL 
        OR ti.last_updated_at <= NOW() - INTERVAL '1 minute' * COALESCE(mp.update_frequency_minutes, 30)
    )
    ORDER BY COALESCE(ti.last_updated_at, ti.created_at) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inserir configurações padrão para usuários existentes (se houver)
INSERT INTO public.monitoring_preferences (user_id)
SELECT DISTINCT user_id 
FROM public.system_settings 
WHERE NOT EXISTS (
    SELECT 1 FROM public.monitoring_preferences mp 
    WHERE mp.user_id = system_settings.user_id
)
ON CONFLICT (user_id) DO NOTHING;