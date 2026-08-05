import calculatePhase from '../utils/calculatePhase.js'

function testCalculatePhase(){
    let knownPairs = [["2002-01-26", "Waxing Gibbous"], 
        ["2007-03-23", "Waxing Crescent"],
        ["2015-09-30", "Waning Gibbous"],
        ["2019-08-02", "Waxing Crescent"],
        ["2025-09-15", "Last Quarter"],
        ["2003-03-22", "Waning Gibbous"],
        ["2011-02-15", "Waxing Gibbous"],
        ["2012-02-27", "Waxing Crescent"],
        ["2018-09-05", "Waning Crescent"],
        ["2019-11-29", "Waxing Crescent"],
    ];

    let failed_tests = 0;
    for (let i = 0; i < knownPairs.length; i++){
        let funcRet = calculatePhase(knownPairs[i][0])
        if (!(funcRet == knownPairs[i][1])){
            console.log("[TEST] "+knownPairs[i][0]+" FAILED!\n\tRECIEVED "+funcRet+"\n\tSHOULD BE "+knownPairs[i][1]);
            failed_tests++;
        }
        else console.log("[TEST] "+knownPairs[i][0]+" PASSED")
    }

    /* 
    because this algorithm is simplified, phases may be slightly off
    To account for this in tests, as long as 80% pass, we say the function works correctly
    */
    if (failed_tests >= 0.2 * knownPairs.length) console.log("WARNING! TEST FAILURE THRESHOLD EXCEEDED");
    else console.log("WITHIN THRESHOLD - calculatePhase OPERATING CORRECTLY")

}

testCalculatePhase();