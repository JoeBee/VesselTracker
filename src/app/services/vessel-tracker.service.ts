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

    getAisData(): Observable<any> {
        // Include necessary headers
        const headers = new HttpHeaders({
            'Accept': 'application/json',
            'Authorization': this.apiToken,
        });

        return this.http.get<any>(this.apiUrlGetVesselPositions, { headers });
    }

    // -----------------------------
    // Returns vessel information by given IMO or MMSI list

    getVesselPositions(imoList: string[]): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.apiToken
        });

        const requestBody = {
            "imo": imoList.map(imo => parseInt(imo, 10))
        };

        console.log('* SENT Request body:', requestBody);
        console.log('* SENT headers:', headers);
        return this.http.post(this.apiUrlGetVesselPositions, requestBody, { headers });
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
    removeVessel(imo: string): Observable<any> {
        const url = `${this.apiUrlRemoveVessel}?imo=${imo}`;
        const headers = new HttpHeaders({
            'Accept': 'application/json',
            'Authorization': this.apiToken,
            // Cookies are handled by the browser's HttpClient requests automatically if needed
            // and configured correctly, usually no need to manually set 'Cookie' header here.
        });

        // HttpClient.delete returns an Observable
        return this.http.delete(url, { headers });
        // Note: Error handling and response processing (like checking status 206) 
        // should now be done where this service method is subscribed to, typically in the component.
    }

    //-------------------------------------------------
}

