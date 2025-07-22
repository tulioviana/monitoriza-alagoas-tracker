
-- Corrigir o CNPJ do item monitorado ARGAMASSA
UPDATE tracked_items 
SET search_criteria = jsonb_set(
    search_criteria, 
    '{estabelecimento,individual,cnpj}', 
    '"00279531000670"'
)
WHERE nickname = 'ARGAMASSA INT SC20KG ACI CZ PLAST QUARTZ SC0001SC - TUPAN CONSTRUCOES LTDA'
AND search_criteria->'estabelecimento'->'individual'->>'cnpj' = '00279531000750';
