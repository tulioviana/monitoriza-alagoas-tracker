-- Correção dos warnings de segurança - definir search_path nas funções

-- Recriar a função update_updated_at_column com search_path seguro
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Recriar a função calculate_price_trend com search_path seguro
CREATE OR REPLACE FUNCTION public.calculate_price_trend(
    p_tracked_item_id BIGINT,
    p_new_price NUMERIC
) RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Recriar a função get_items_needing_update com search_path seguro
CREATE OR REPLACE FUNCTION public.get_items_needing_update()
RETURNS TABLE (
    item_id BIGINT,
    user_id UUID,
    item_type TEXT,
    search_criteria JSONB,
    nickname TEXT,
    update_frequency_minutes INTEGER
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;