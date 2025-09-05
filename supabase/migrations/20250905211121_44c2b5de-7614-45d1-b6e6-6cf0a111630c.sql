-- Completar onboarding para a conta Motiz que estava pendente
UPDATE profiles 
SET onboarding_completed = true, updated_at = now()
WHERE email = 'falecom@motiz.com.br' AND onboarding_completed = false;