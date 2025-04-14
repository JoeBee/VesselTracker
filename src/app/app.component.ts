import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VesselTrackerService } from './services/vessel-tracker.service';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VesselInfo } from './models/vessel-info.interface';
import { forkJoin, of } from 'rxjs'; // Import forkJoin and of
import { map, catchError } from 'rxjs/operators'; // Import map and catchError

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'vessel-tracker';
  rtnAisData: any[] = [];
  vesselPositions: VesselInfo[] = [];
  addVesselResult: any = null;
  // Add a property to store removal results
  removalResults: { imo: string, success: boolean, message: string }[] = [];
  error: string | null = null;
  // Add 'removalResults' to possible active sections
  activeSection: 'aisData' | 'vesselPositions' | 'add' | 'removalResults' | null = null;
  imoList: string = '';
  imoArray: string[] = [];
  private datePipe = new DatePipe('en-US');
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(private vesselTrackerService: VesselTrackerService) { }

  ngOnInit() {
    // Set default IMO numbers
    this.imoList = `1234565
1234566
1234567
1234568
1234569`;
    this.updateImoArray();
  }

  updateImoArray(): void {
    this.imoArray = this.imoList
      .split('\n')
      .map(imo => imo.trim())
      .filter(imo => imo.length > 0 && /^\d+$/.test(imo)); // Ensure IMOs are numeric strings
  }

  getFormattedDate(input: string | { lastUpdate?: string; timestamp?: string } | undefined): string {
    if (!input) return 'N/A';

    // If input is a string (direct date value)
    if (typeof input === 'string') {
      const formattedDate = this.datePipe.transform(input, 'medium');
      return formattedDate || 'N/A';
    }

    // If input is an object (vessel position data)
    const date = input.lastUpdate || input.timestamp;
    if (!date) return 'N/A';

    const formattedDate = this.datePipe.transform(date, 'medium');
    return formattedDate || 'N/A';
  }

  getFormattedSpeed(speed: number | undefined): string {
    if (speed === undefined) return 'N/A';
    return `${speed.toFixed(1)} knots`;
  }

  getFormattedDimensions(length: number | undefined, width: number | undefined): string {
    if (length === undefined || width === undefined) return 'N/A';
    return `${length}m × ${width}m`;
  }

  getFormattedTonnage(deadWeight: number | undefined, grossTonnage: number | undefined): string {
    if (deadWeight === undefined || grossTonnage === undefined) return 'N/A';
    return `DW: ${deadWeight.toLocaleString()}t, GT: ${grossTonnage.toLocaleString()}t`;
  }

  // ------------------------------------------------------------
  // * API Documentation:
  // https://api.vesseltracker.com/api/v1/api-docs/index.html#/Uservessels/

  // AISData - Returns vessel information by given IMO or MMSI list
  // https://api.vesseltracker.com/api/v1/api-docs/index.html#/AISData/post_AISData
  getAisData() {
    this.activeSection = 'aisData';
    this.vesselPositions = [];
    this.addVesselResult = null;
    this.removalResults = []; // Clear removal results
    this.error = null;
    this.vesselTrackerService.getAisData().subscribe({
      next: (response: any) => {
        // Check if response is an array, if not, try to find the array in the response
        if (Array.isArray(response)) {
          this.rtnAisData = response;
        } else if (response && typeof response === 'object') {
          // Try to find the array in common response structures
          const possibleArrays = [
            response.data,
            response.vessels,
            response.positions,
            response.results,
            Object.values(response).find(val => Array.isArray(val))
          ].filter(Boolean);

          if (possibleArrays.length > 0) {
            this.rtnAisData = possibleArrays[0];
          } else {
            this.error = 'Invalid response format from API';
            console.error('Unexpected API response format:', response);
            this.rtnAisData = []; // Ensure it's an empty array on error
          }
        } else {
          this.error = 'Invalid response format from API';
          console.error('Unexpected API response format:', response);
          this.rtnAisData = []; // Ensure it's an empty array on error
        }
        console.log('Vessel positions:', this.rtnAisData);

        // Apply initial sort by vessel name if data is loaded
        if (this.rtnAisData.length > 0) {
          this.sortColumn = 'name';
          this.sortDirection = 'asc';
          this.sortVessels('name');
        }
      },
      error: (err) => {
        this.error = 'Error loading vessel positions: ' + err.message;
        console.error('Error:', err);
        this.rtnAisData = []; // Ensure it's an empty array on error
      }
    });
  }

  // For live vessel positions of a maintained list of vessels:
  // --> /vessels/userlist/latestpositions - Retrieve the latest positions for the user's vessels
  // https://api.vesseltracker.com/api/v1/api-docs/index.html#/Uservessels/get_vessels_userlist_latestpositions
  getVesselPositions() {
    this.activeSection = 'vesselPositions';
    this.rtnAisData = [];
    this.addVesselResult = null;
    this.removalResults = []; // Clear removal results
    this.error = null;
    this.vesselTrackerService.getVesselPositions(this.imoArray).subscribe({
      next: (response: any) => {
        // Ensure response is properly formatted as an array of VesselInfo objects
        if (response) {
          // If response is not an array, try to convert it to one
          const responseArray = Array.isArray(response) ? response : [response];

          // Filter out any null or undefined items and ensure they have the required structure
          this.vesselPositions = responseArray.filter(item => {
            // Make sure the item and aisStatic exist before adding to vesselInfo
            return item && typeof item === 'object';
          }).map(item => {
            // Ensure all required properties exist with appropriate defaults
            return {
              aisStatic: item.aisStatic || {},
              aisPosition: item.aisPosition || {},
              aisVoyage: item.aisVoyage || {},
              geoDetails: item.geoDetails || {},
              vesselDetails: item.vesselDetails || {},
              voyageDetails: item.voyageDetails || {}
            };
          });

          console.log('Vessel info:', this.vesselPositions);
        } else {
          this.error = 'No vessel information received from API';
          this.vesselPositions = []; // Ensure it's an empty array
        }
      },
      error: (err) => {
        this.error = 'Error loading vessel info: ' + err.message;
        console.error('Error:', err);
        this.vesselPositions = []; // Ensure it's an empty array on error
      }
    });
  }

  // /vessels/userlist/add - Add vessels by IMO or MMSI list
  // https://api.vesseltracker.com/api/v1/api-docs/index.html#/Uservessels/post_vessels_userlist_add
  addVessels() {
    this.activeSection = 'add';
    this.rtnAisData = [];
    this.vesselPositions = [];
    this.removalResults = []; // Clear removal results
    this.error = null;
    this.vesselTrackerService.addVessels(this.imoArray).then(response => {
      this.addVesselResult = response;
      console.log('Vessel added:', this.addVesselResult);
    }).catch(err => {
      this.error = 'Error adding vessel: ' + err.message;
      console.error('Error:', err);
      this.addVesselResult = { error: err.message }; // Show error in result
    });
  }

  // /vessels/userlist/remove?imo={imo} - Remove vessel by IMO
  // https://api.vesseltracker.com/api/v1/api-docs/index.html#/Uservessels/delete_vessels_userlist_remove_imo
  removeVessel() {
    if (this.imoArray.length === 0) {
      this.error = 'Please enter at least one IMO number in the list to remove.';
      this.activeSection = null; // Ensure no section is active
      return;
    }

    // Prepare for removal operation
    this.activeSection = 'removalResults'; // Set section to show results
    this.rtnAisData = [];
    this.vesselPositions = [];
    this.addVesselResult = null;
    this.removalResults = []; // Clear previous results
    this.error = null; // Clear previous general errors

    const removalObservables = this.imoArray.map(imo =>
      this.vesselTrackerService.removeVessel(imo).pipe(
        map(response => ({ // Map success response
          imo: imo,
          success: true,
          message: `Vessel ${imo} removed successfully.`
        })),
        catchError(err => of({ // Catch errors and map to error result
          imo: imo,
          success: false,
          message: `Error removing vessel ${imo}: ${err.error?.message || err.message}`
        }))
      )
    );

    forkJoin(removalObservables).subscribe({
      next: (results) => {
        this.removalResults = results;
        console.log('Removal results:', this.removalResults);

        // Filter out successfully removed IMOs from the list
        const successfulImos = results.filter(r => r.success).map(r => r.imo);
        if (successfulImos.length > 0) {
          // this.imoList = this.imoList
          //   .split('\n')
          //   .map(line => line.trim())
          //   .filter(imo => !successfulImos.includes(imo))
          //   .join('\n');
          // this.updateImoArray();  // Update the array based on the new list
        }
      },
      error: (err) => {
        // This error block is for errors in forkJoin itself, though unlikely with catchError inside
        this.error = 'An unexpected error occurred during the removal process.';
        console.error('Error in forkJoin:', err);
        // Optionally, populate removalResults with a general error message if needed
        this.removalResults = this.imoArray.map(imo => ({
          imo: imo,
          success: false,
          message: `Failed to process removal for ${imo} due to a batch error.`
        }));
      }
    });
  }

  // ------------------------------------------------------------

  scrollToTableTop() {
    const tableBody = document.querySelector('.vessel-table tbody');
    if (tableBody) {
      tableBody.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }

  scrollToTableBottom() {
    const tableBody = document.querySelector('.vessel-table tbody');
    if (tableBody) {
      tableBody.scrollTo({
        top: tableBody.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  sortVessels(column: string) {
    // If clicking the same column, toggle sort direction
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // If clicking a new column, set as the sort column with ascending direction
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    // Sort the vessels array based on the selected column and direction
    this.rtnAisData.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      // Use optional chaining and provide default values for sorting robustness
      switch (column) {
        case 'name':
          valueA = a?.aisStatic?.name?.toLowerCase() || '';
          valueB = b?.aisStatic?.name?.toLowerCase() || '';
          break;
        case 'position':
          // Sort by latitude if available, handle undefined
          valueA = a?.aisPosition?.lat ?? -Infinity; // Use ?? for null/undefined
          valueB = b?.aisPosition?.lat ?? -Infinity;
          break;
        case 'speed':
          valueA = a?.aisPosition?.sog ?? -1; // Default to -1 or similar if needed
          valueB = b?.aisPosition?.sog ?? -1;
          break;
        case 'course':
          valueA = a?.aisPosition?.cog ?? -1;
          valueB = b?.aisPosition?.cog ?? -1;
          break;
        case 'lastUpdated':
          valueA = a?.aisPosition?.timeReceived ? new Date(a.aisPosition.timeReceived).getTime() : 0;
          valueB = b?.aisPosition?.timeReceived ? new Date(b.aisPosition.timeReceived).getTime() : 0;
          break;
        default:
          return 0;
      }

      // Compare the values based on sort direction
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return this.sortDirection === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      } else {
        // Ensure numeric comparison even if types might differ slightly after defaults
        const numA = Number(valueA);
        const numB = Number(valueB);
        return this.sortDirection === 'asc'
          ? numA - numB
          : numB - numA;
      }
    });
  }

  // ------------------------------------------------------------

}
