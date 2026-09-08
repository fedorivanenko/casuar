insert into casuar_do.experiments (name, kind, definition) values
('hpylori-glutamine-coverage','coverage','{"passCondition":"Fresh graph expansion independently discovers glutamine depletion/restoration in mechanistic context."}'::jsonb),
('hpylori-bridge-objective','objective','{"requiredObjectives":["pathogen_pressure","mucosal_injury","progression_risk","systemic_consequences","adverse_effects","diagnostic_information"],"antiPattern":"Optimize only eradication probability."}'::jsonb)
on conflict (name) do update set kind=excluded.kind, definition=excluded.definition;

insert into casuar_do.regression_cases (name, kind, definition) values
('hpylori-glutamine-coverage','coverage','{"seed":"H. pylori -> GGT/glutaminase -> epithelial injury","target":"glutamine","test":"rediscovery from graph-generated research questions"}'::jsonb),
('hpylori-bridge-objective','objective','{"context":"3-5 month bridge before definitive work-up","mustDerive":["pathogen_pressure","mucosal_injury","progression_risk","systemic_consequences","adverse_effects","diagnostic_information"],"mustNot":"eradication-only objective"}'::jsonb)
on conflict (name) do update set kind=excluded.kind, definition=excluded.definition, active=true;
