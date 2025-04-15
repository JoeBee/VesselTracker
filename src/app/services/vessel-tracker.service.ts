import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class VesselTrackerService {
    private apiToken: string = '';

    // API:
    // https://api.vesseltracker.com/api/v1/api-docs/index.html#/Uservessels/

    // Returns AIS Data
    // https://api.vesseltracker.com/api/v1/api-docs/index.html#/AISData/post_AISData
    private apiUrlGetAisData = 'https://api.vesseltracker.com/api/v1/AISData';

    // Retrieve the latest positions for the user's vessels
    // https://api.vesseltracker.com/api/v1/api-docs/index.html#/Uservessels/get_vessels_userlist_latestpositions
    private apiUrlGetVesselPositions = 'https://api.vesseltracker.com/api/v1/vessels/userlist/latestpositions';

    // Add vessels by IMO or MMSI list
    // https://api.vesseltracker.com/api/v1/api-docs/index.html#/Uservessels/post_vessels_userlist_add
    private apiUrlAddVessels = 'https://api.vesseltracker.com/api/v1/vessels/userlist/add';

    // Deletes a vessel by IMO or MMSI from users's list
    // https://api.vesseltracker.com/api/v1/api-docs/index.html#/Uservessels/delete_vessels_userlist_remove
    private apiUrlRemoveVessel = 'https://api.vesseltracker.com/api/v1/vessels/userlist/remove';

    constructor(private http: HttpClient) { }

    // Method to update the token
    setToken(token: string): void {
        this.apiToken = token;
    }

    // -----------------------------
    // Retrieve the latest positions for the user's vessels

    getAisData(imoList: string[]): Observable<any> {
        // Include necessary headers
        const headers = new HttpHeaders({
            'Accept': 'application/json',
            'Authorization': this.apiToken,
        });

        return this.http.post<any>(this.apiUrlGetAisData, { imo: imoList }, { headers });
    }

    // -----------------------------
    // Returns vessel information by given IMO or MMSI list

    getVesselPositions(): Observable<any> {
        const headers = new HttpHeaders({
            'Accept': 'application/json',
            'Authorization': this.apiToken,
        });

        // Example timestamp, consider making this dynamic or configurable if needed
        const updatedSince = '2018-12-18T12:00:00+0200';
        const url = `${this.apiUrlGetVesselPositions}?updatedSince=${encodeURIComponent(updatedSince)}`;

        return this.http.get<any>(url, { headers });
    }

    // -----------------------------
    // Add vessels by IMO or MMSI list

    async addVessels(imoList: string[]) {
        const vesselData = {
            "imo": imoList.map(imo => parseInt(imo, 10))
        };

        try {
            const response = fetch(this.apiUrlAddVessels, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.apiToken,
                    // Include other necessary headers from the original request as needed,
                    // except for browser-specific or automatically managed headers (e.g., cookie).
                    'Accept': 'application/json',
                },
                body: JSON.stringify(vesselData), // Assuming vesselData is the data you want to send
            });

            if ((await response).status === 206) {
                console.warn("Partial Content received. Check response carefully.");
            } else if (!(await response).ok) {
                throw new Error(`HTTP error! status: ${(await response).status}`);
            }

            const data = await (await response).json();
            return data;
        } catch (error) {
            console.error('Error during API call:', error);
            // Handle the error appropriately in your application.  
            // Consider re-throwing or returning a specific error value/object.
            throw error;
        }
    }

    //-------------------------------------------------
    // Remove vessel by IMO 
    // https://api.vesseltracker.com/api/v1/api-docs/index.html#/Uservessels/delete_vessels_userlist_remove_imo
    removeVessels(imoList: string[]): Observable<any> {
        const vesselData = {
            "imo": imoList.map(imo => parseInt(imo, 10))
        };

        const headers = new HttpHeaders({
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': this.apiToken,
        });

        return this.http.post<any>(this.apiUrlRemoveVessel, vesselData, { headers });
    }
    //-------------------------------------------------
}

