import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VesselTrackerService } from './services/vessel-tracker.service';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VesselInfo } from './models/vessel-info.interface';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'vessel-tracker';
  vesselPositions: any[] = [];
  vesselInfo: VesselInfo[] = [];
  addVesselResult: any = null;
  error: string | null = null;
  activeSection: 'positions' | 'info' | 'add' | null = null;
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
    // this.loadVesselPositions();
    // this.getVesselInfo();
  }

  updateImoArray() {
    this.imoArray = this.imoList
      .split('\n')
      .map(imo => imo.trim())
      .filter(imo => imo.length > 0);
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

  // * API Documentation:
  // For live vessel positions in return for an IMO or MMSI array: 
  // https://api.vesseltracker.com/api/v1/api-docs/index.html#/AISData/post_AISData
  loadVesselPositions() {
    this.activeSection = 'positions';
    this.vesselInfo = [];
    this.addVesselResult = null;
    this.vesselTrackerService.getLatestVesselPositions().subscribe({
      next: (response: any) => {
        // Check if response is an array, if not, try to find the array in the response
        if (Array.isArray(response)) {
          this.vesselPositions = response;
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
            this.vesselPositions = possibleArrays[0];
          } else {
            this.error = 'Invalid response format from API';
            console.error('Unexpected API response format:', response);
          }
        } else {
          this.error = 'Invalid response format from API';
          console.error('Unexpected API response format:', response);
        }
        console.log('Vessel positions:', this.vesselPositions);

        // Apply initial sort by vessel name if data is loaded
        if (this.vesselPositions.length > 0) {
          this.sortColumn = 'name';
          this.sortDirection = 'asc';
          this.sortVessels('name');
        }
      },
      error: (err) => {
        this.error = 'Error loading vessel positions: ' + err.message;
        console.error('Error:', err);
      }
    });
  }

  // * API Documentation:
  // For live vessel positions of a maintained list of vessels: 
  // https://api.vesseltracker.com/api/v1/api-docs/index.html#/Uservessels/get_vessels_userlist_latestpositions
  getVesselInfo() {
    this.activeSection = 'info';
    this.vesselPositions = [];
    this.addVesselResult = null;
    this.vesselTrackerService.makeInfobyImoOrMmsiApiCall(this.imoArray).subscribe({
      next: (response: any) => {
        this.vesselInfo = Array.isArray(response) ? response : [response];
        console.log('Vessel info:', this.vesselInfo);
      },
      error: (err) => {
        this.error = 'Error loading vessel info: ' + err.message;
        console.error('Error:', err);
      }
    });
  }

  // * API Documentation:
  // https://api.vesseltracker.com/api/v1/api-docs/index.html#/Uservessels/post_vessels_userlist_add
  addVessel() {
    this.activeSection = 'add';
    this.vesselPositions = [];
    this.vesselInfo = [];
    this.vesselTrackerService.addVesselToUserList(this.imoArray).then(response => {
      this.addVesselResult = response;
      console.log('Vessel added:', this.addVesselResult);
    }).catch(err => {
      this.error = 'Error adding vessel: ' + err.message;
      console.error('Error:', err);
    });
  }

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
    this.vesselPositions.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (column) {
        case 'name':
          valueA = a.aisStatic?.name || '';
          valueB = b.aisStatic?.name || '';
          break;
        case 'position':
          // Sort by latitude if available
          valueA = a.aisPosition?.lat || -999;
          valueB = b.aisPosition?.lat || -999;
          break;
        case 'speed':
          valueA = a.aisPosition?.sog || 0;
          valueB = b.aisPosition?.sog || 0;
          break;
        case 'course':
          valueA = a.aisPosition?.cog || 0;
          valueB = b.aisPosition?.cog || 0;
          break;
        case 'lastUpdated':
          valueA = a.aisPosition?.timeReceived ? new Date(a.aisPosition.timeReceived).getTime() : 0;
          valueB = b.aisPosition?.timeReceived ? new Date(b.aisPosition.timeReceived).getTime() : 0;
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
        return this.sortDirection === 'asc'
          ? valueA - valueB
          : valueB - valueA;
      }
    });
  }
}
