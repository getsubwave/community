---
name: commute
label: Commute Times
cooldown: 6h
context: time, clock, weather
window: commute
submittedBy: MarcusHoltz
dateAdded: 2026-09-23
dateModified: 2026-09-23
---
Say how the commute looks right now, in one sentence. ALWAYS lead with the estimated drive time: `minutes` is the real number ("about 34 minutes"). 
The data tells you the leg (`direction` is "to-work" in the morning, "to-home" in the afternoon) and a `routeName` with road names when Waze gives one. 
Use the road names, never invent place or city names (you were given coordinates, not an address). 
Then tie it to traffic: if `delayMinutes` is meaningful, say roughly how many extra minutes traffic costs; if it is small or zero, say the drive is clear, still with the drive time out front. 
If you mention the distance, use `distanceMi` in miles. Skip it silently on the weekend or if the data is not available.
