import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class VesselTrackerService {
    private token = 'ddd42902-9c93-441d-834c-c0fe741130fc';
    private apiUrlGetVesselPositions = 'https://api.vesseltracker.com/api/v1/vessels/userlist/latestpositions';
    private apiUrlPostInfobyImoOrMmsi = 'https://api.vesseltracker.com/api/v1/AISData';
    private apiUrlPost2 = 'https://api.vesseltracker.com/api/v1/vessels/userlist/add';

    constructor(private http: HttpClient) { }

    // -----------------------------
    // Retrieve the latest positions for the user's vessels

    getLatestVesselPositions(): Observable<any> {
        // Include necessary headers
        const headers = new HttpHeaders({
            'Accept': 'application/json',
            'Authorization': this.token,            //  Other headers, if needed, e.g., cookies: '...'
        });

        return this.http.get<any>(this.apiUrlGetVesselPositions, { headers });
    }

    // -----------------------------
    // Returns vessel information by given IMO or MMSI list

    makeInfobyImoOrMmsiApiCall(imoList: string[]): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': this.token
        });

        const requestBody = {
            "imo": imoList.map(imo => parseInt(imo, 10))
        };

        return this.http.post(this.apiUrlPostInfobyImoOrMmsi, requestBody, { headers });
    }

    // -----------------------------
    // Add vessels by IMO or MMSI list

    async addVesselToUserList(imoList: string[]) {
        const vesselData = {
            "imo": imoList.map(imo => parseInt(imo, 10))
        };

        try {
            const response = fetch(this.apiUrlPost2, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.token, // Replace with a valid auth token
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
}

