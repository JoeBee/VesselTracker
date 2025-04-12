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
      },
      error: (err) => {
        this.error = 'Error loading vessel positions: ' + err.message;
        console.error('Error:', err);
      }
    });
  }

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
}
