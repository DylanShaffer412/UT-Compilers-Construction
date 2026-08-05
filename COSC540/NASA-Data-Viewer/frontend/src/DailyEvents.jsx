import EventCard from "./EventCard"
import "./DailyEvents.css"
import {useState, useEffect} from 'react'

//TODO: Add comments explaining the functions

function calculatePhase(){
    const knownNewMoon = new Date('2000-01-06');
    const today = new Date();

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

function callAPI(api_name){
        return fetch(`http://localhost:8000/api/${api_name}/today`)
        .then(res => res.json())
        .then(data  => {
            if (data.rows.length > 0) {return data}
            else {return null}
        })
}

function DailyEvents(){
    const [lunarPhase, setLunarPhase] = useState(null);
    const [solarEclipse, setSolarEclipse] = useState(null);
    const [coronalMassEjections, setCoronalMassEjections] = useState(null);
    const [solarFlares, setSolarFlares] = useState(null);
    const [geomagneticStorms, setGeomagneticStorms] = useState(null);
    const [nearEarthObjects, setNearEarthObjects] = useState(null);
    const [imgPath, setImgPath] = useState(null);
    
    //AAI
    useEffect(() => {
        callAPI("lunar-phase").then(data => {
            if (data != null) setLunarPhase(data.rows[0].phase)
            else setLunarPhase(calculatePhase())
        })
    }, [])

    useEffect(() =>{
        switch(lunarPhase){
        case "New Moon":
            setImgPath("/newMoon.png");
            break;
        case "Waxing Crescent":
            setImgPath("/waxingCrescent.png");
            break;
        case "First Quarter":
            setImgPath("/firstQuarter.png");
            break;
        case "Waxing Gibbous":
            setImgPath("/waxingGibbous.png");
            break;
        case "Full Moon":
            setImgPath("/fullMoon.png");
            break;
        case "Waning Gibbous":
            setImgPath("/waningGibbous.png");
            break;
        case "Last Quarter":
            setImgPath("/lastQuarter.png");
            break;
        case "Waning Crescent":
            setImgPath("/waningCrescent.png");
            break;
        default:
            break;
        }
    }, [lunarPhase])

    //AAI
    useEffect(() => {
        callAPI("solar-eclipses").then(data => {
            if (data != null) setSolarEclipse(data)
        })
    }, [])

    //CME
    useEffect(() => {
        callAPI("cme-events").then(data => {
            if (data != null) setCoronalMassEjections(data.rows)
        })
    }, [])

    //FLR
    useEffect(() => {
        callAPI("solar-flares").then(data => {
            if (data != null) setSolarFlares(data.rows)
        })
    }, [])

    //GST
    useEffect(() => {
        callAPI("geomagnetic-storms").then(data => {
            if (data != null) setGeomagneticStorms(data.rows)
        })
    }, [])

    //NEO
    useEffect(() => {
        callAPI("near-earth-objects").then(data => {
            if (data != null) setNearEarthObjects(data.rows)
        })
    }, [])

    return(
        <>
        <div className="dailyEventsPage">
            <div className="heroContainer">
            {lunarPhase
                ? <>
                        <div className="heroLabelContainer">
                            <p className="dateLabel">{new Date().toLocaleDateString('en-US')}</p>
                            <p className="lunaLabel">{lunarPhase}</p>
                        </div>
                        <img className="luna" src={imgPath} alt="lunar phase image"/>
                  </>
                : <p>No lunar phase data found</p>
            }
            </div>
            <div className="dailyEvents_EventContainer">
                {solarEclipse && <EventCard key={solarEclipse}/>}
                {coronalMassEjections && coronalMassEjections.map((cme) =>(
                    <EventCard key={cme.id} eventType={"C.M.E. "+cme.id+" - Source: "+cme.source_location} eventSeverity={"Type " + cme.cme_analyses[0].type} eventDescription={cme.note}/>
                ))}
                {solarFlares && solarFlares.map((flr) =>(
                    <EventCard key={flr.id} eventType={"Solar Flare "+flr.flr_id} eventSeverity={"Class " + flr.class_type} eventDescription={flr.note}/>
                ))}
                {geomagneticStorms && geomagneticStorms.map((gst) =>(
                    <EventCard key={gst.id} eventType={"Geomagnetic Storm "+gst.gst_id} eventSeverity={"KP index: " + gst.kp_index[0].kpIndex}/>
                ))}
                {nearEarthObjects && nearEarthObjects.map((neo) =>(
                    <EventCard key={neo.id} eventType={"N.E.O "+neo.name} eventSeverity={neo.is_potentiall_hazardous ? "potentially hazardous" : "benign"} eventDescription={"Currently Orbiting: " + neo.orbiting_body + "\n Estimated Diameter: "+neo.estimated_diameter.kilometers.estimated_diameter_min.toFixed(4)+" - "+neo.estimated_diameter.kilometers.estimated_diameter_min.toFixed(4)+"km"}/>
                ))}
            </div>
        </div>
        </>
    )

}

export default DailyEvents