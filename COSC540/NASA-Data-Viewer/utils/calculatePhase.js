function calculatePhase(dateString){
    const knownNewMoon = new Date('2000-01-06');
    let today = new Date();
    if (dateString) today = new Date(dateString);

    const milisecondsSinceNewMoon = today - knownNewMoon;
    const daysSinceNewMoon = milisecondsSinceNewMoon / (1000*60*60*24);

    const lunarCycleTime = 29.53; // each lunar cycle is approx 29.53 days long
    const phase = (daysSinceNewMoon % lunarCycleTime + lunarCycleTime) % lunarCycleTime;

    if (phase < 1.85) return "New Moon";
    if (phase < 7.38) return "Waxing Crescent";
    if (phase < 9.22)  return "First Quarter";
    if (phase < 14.77) return "Waxing Gibbous";
    if (phase < 16.61) return "Full Moon";
    if (phase < 22.15) return "Waning Gibbous";
    if (phase < 23.99) return "Last Quarter";
    if (phase < 29.53) return "Waning Crescent";

}

export default calculatePhase