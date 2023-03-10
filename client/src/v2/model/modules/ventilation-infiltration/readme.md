# On ventilation and infiltration

In SAP 9, ventilation and infiltration are not clearly distinguished - any
mechanism by which air flows through a building is referred to as
"ventilation", with "infiltration" being a sub-category of it. We have chosen to
deviate from SAP by considering ventilation and infiltration as separate
effects with separate modules.

Ventilation encompasses a ventilation system, possibly taking into account any
extract ventilation points (e.g. fans). Infiltration encompasses intentional
vents and flues, (e.g. chimneys) and structural infiltration through building
fabric.

[Relevant historical discussion regarding
EVP](https://github.com/emoncms/MyHomeEnergyPlanner/issues/177)
