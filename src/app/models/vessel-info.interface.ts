export interface AisPosition {
    cog: number;
    hdg: number;
    lat: number;
    lon: number;
    navStatus: number;
    rot: number;
    sog: number;
    src: string;
    timeReceived: string;
}

export interface AisStatic {
    aisClass: string;
    aisShiptype: string;
    callsign: string;
    dimA: number;
    dimB: number;
    dimC: number;
    dimD: number;
    flag: string;
    imo: number;
    length: number;
    mmsi: number;
    name: string;
    typeOfShipAndCargo: number;
    updateTime: string;
    width: number;
}

export interface AisVoyage {
    cargotype: number;
    dest: string;
    draught: number;
    eta: string;
    source: string;
    updateTime: string;
}

export interface GeoDetails {
    area: string;
    currentBerth: string;
    currentPort: string;
    currentPortLocode: string;
    portCountry: string;
    status: string;
    timeOfATChange: string;
}

export interface VesselDetails {
    deadWeight: number;
    grossTonnage: number;
    shipDBName: string;
    shipType: string;
    sizeClass: string;
    teu: number;
}

export interface VoyageDetails {
    calculatedEta: string;
    destination: string;
    lastPort: string;
    lastPortCountry: string;
    lastPortDepartureTime: string;
    lastPortLocode: string;
    locode: string;
    portCountry: string;
}

export interface VesselInfo {
    aisPosition: AisPosition;
    aisStatic: AisStatic;
    aisVoyage: AisVoyage;
    geoDetails: GeoDetails;
    vesselDetails: VesselDetails;
    voyageDetails: VoyageDetails;
} 