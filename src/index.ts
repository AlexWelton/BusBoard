
const readline = require("node:readline");

type BusDetails =  {
    "$type": string,
    "id": string,
    "operationType": number,
    "vehicleId": string,
    "naptanId": string,
    "stationName": string,
    "lineId": string,
    "lineName": string,
    "platformName": string,
    "direction": string,
    "bearing": string,
    "tripId": string,
    "baseVersion": string,
    "destinationNaptanId": string,
    "destinationName": string,
    "timestamp": string,
    "timeToStation": number,
    "currentLocation": string,
    "towards": string,
    "expectedArrival": string,
    "timeToLive": string,
    "modeName": string,
    "timing": {
        "$type": string,
        "countdownServerAdjustment": string,
        "source": string,
        "insert": string,
        "read": string,
        "sent": string,
        "received": string
    }
}

type StopPoint = {
    distance: number,
    id: string
}

type GeoCoords = {
    latitude: number
    longitude: number
}

async function queryArrivals( stopCode: string) {
    let query = `https://api.tfl.gov.uk/StopPoint/${stopCode}/Arrivals?app_key=83944ee14a534d978a5012be9e3e4f8b`

    try {
        const response = await fetch(query);
        const responseJson = await response.json();
        console.log(getNextNBusDetails(responseJson, 5));
    } catch (error: any) {
        console.error(error)
    }
}

function getTimeToArrival(bus: BusDetails) {
    return Math.floor(bus.timeToStation / 60);
}


function getNextNBusDetails(response: BusDetails[], n: number): string{
    let message = ""

    let sortedBuses = response.sort(
        function (a: BusDetails, b: BusDetails): number {
            return Math.sign(a.timeToStation - b.timeToStation)
        }
    )

    for (let i = 0; i < n; i++) {
        let bus = sortedBuses[i]

        message += "Line : " + bus.lineName + "\n"
            + "Destination : " + bus.destinationName + "\n"
            + "Minutes until arrival : " + getTimeToArrival(bus) + "\n\n"
    }
    return message
}

async function getPostcodeLocation(postCode: string) : Promise<GeoCoords | undefined>{
    let query = `https://api.postcodes.io/postcodes/${postCode}`
    try {
        const response = await fetch(query);
        const responseJson = await response.json();
        return {latitude: responseJson.result.latitude, longitude: responseJson.result.longitude}
    } catch (error: any) {
        console.error(error)
    }

    return undefined

}

async function getNearestNStopPoints(geocoords: GeoCoords, count: number) {
    let query = `https://api.tfl.gov.uk/StopPoint/?app_key=83944ee14a534d978a5012be9e3e4f8b&lat=${geocoords.latitude}&lon=${geocoords.longitude}&stopTypes=NaptanPublicBusCoachTram`
    try {
        const response = await fetch(query);
        const responseJson = await response.json();

        let sortedStops = responseJson.stopPoints.sort(
            function(a:StopPoint,b:StopPoint) {return a.distance - b.distance}
        );

        return sortedStops.slice(0,count)

    } catch (error: any) {
        console.error(error)
    }
}

async function postCodeToStopCode(postCode: string) {

    let geocoords = await getPostcodeLocation(postCode);

    if (geocoords == undefined) throw new Error("Undefined postcode coords");

    let stopPoints = await getNearestNStopPoints(geocoords,2);

    for (let stopPoint of stopPoints) {
        console.log(`Arrivals to ${stopPoint.commonName}`)
        await queryArrivals(stopPoint.id);
    }

}

async function getArrivals() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question(`Enter Stop Code : `, (stopCode: string) => {
        if (stopCode === "") stopCode = "490008660N"

        queryArrivals(stopCode);
        rl.close();
    });
}

postCodeToStopCode("NW51TL")

module.exports = {getArrivals};