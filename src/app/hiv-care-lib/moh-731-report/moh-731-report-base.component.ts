
import { take } from 'rxjs/operators';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
// import { Observable, Subject } from 'rxjs';

import * as Moment from 'moment';
import * as _ from 'lodash';

import { Moh731ResourceService } from '../../etl-api/moh-731-resource.service';

@Component({
  selector: 'moh-731-report-base',
  template: 'moh-731-report-base.component.html',
  styleUrls: ['./moh-731-report-base.component.css'],
})
export class Moh731ReportBaseComponent implements OnInit {

  @ViewChild('mohPdf')
  public pdfView: any;
  public data = [];
  public sectionsDef = [];
  public statusError = false;
  public isReleased = true;

  public showLocationsControl = false;
  public showIsAggregateControl = false;

  public showPatientList = false;
  public showTabularView = true;
  public showPatientListLoader = false;
  public isLoadingReport = false;
  public showInfoMessage = false;
  public errorMessage = '';
  public currentView = 'pdf'; // can be pdf or tabular or patientList
  public currentIndicator = '';
  private _startDate: Date = Moment().subtract(1, 'months').startOf('month').toDate();
  public get startDate(): Date {
    return this._startDate;
  }

  public set startDate(v: Date) {
    this._startDate = v;
  }

  private _endDate: Date = Moment().subtract(1, 'months').endOf('month').toDate();
  public get endDate(): Date {
    return this._endDate;
  }

  public set endDate(v: Date) {
    this._endDate = v;
  }

  private _locationUuids: any = [];
  public get locationUuids(): Array<string> {
    return this._locationUuids;
  }

  public set locationUuids(v: Array<string>) {
    const locationUuids = [];
    _.each(v, (location: any) => {
      if (location.value) {
        locationUuids.push(location);
      }
    });
    this._locationUuids = locationUuids;
  }

  private _patientListLocationUuids: Array<string> = [];
  public get patientListLocationUuids(): any {
    return this._patientListLocationUuids;
  }

  public set patientListLocationUuids(v: any) {
    this._patientListLocationUuids = v;
  }

  private _isLegacyReport = false;
  public get isLegacyReport(): boolean {
    return this._isLegacyReport;
  }

  public set isLegacyReport(v: boolean) {
    this._isLegacyReport = v;
  }

  private _isAggregated: boolean;
  public get isAggregated(): boolean {
    return this._isAggregated;
  }
  public set isAggregated(v: boolean) {
    this._isAggregated = v;
  }

  constructor(
    public moh731Resource: Moh731ResourceService,
    public route: ActivatedRoute,
    public router: Router) {
  }

  public ngOnInit() {
  }

  public generateReport() {
    // set busy indications variables
    // clear error
    this.showInfoMessage = false;
    this.statusError = false;
    this.errorMessage = '';
    this.isLoadingReport = true;
    this.data = [];
    this.sectionsDef = [];

    this.moh731Resource
      .getMoh731Report(this.getSelectedLocations(this.locationUuids),
        this.toDateString(this.startDate), this.toDateString(this.endDate),
        this.isLegacyReport, this.isAggregated, 1 * 60 * 1000).pipe(take(1)).subscribe(
          (data) => {
            if (data.error) {
              // if there is an error
              this.processInfoMsg(data);
              this.showInfoMessage = true;
            } else {
              this.sectionsDef = data.sectionDefinitions;
              this.data = data.result;
              this.isReleased = data.isReleased;
            }
            this.isLoadingReport = false;
          }, (error) => {
            this.isLoadingReport = false;
            this.errorMessage = error;
            this.showInfoMessage = true;
          });
  }

  public onIndicatorSelected(indicator: any) {
    this.currentIndicator = '';
    setTimeout(() => {
      if (this.isAggregated) {
        this.patientListLocationUuids = this._locationUuids;
      } else {
        this.patientListLocationUuids = [{
          value: indicator.location
        }];
      }
      this.currentIndicator = indicator.indicator;
      this.goToPatientList();

    }, 100);

  }

  public goToPatientList() {
    if (Array.isArray(this.patientListLocationUuids) &&
      this.patientListLocationUuids.length > 0 && this.currentIndicator) {
      this.showTabularView = false;
      this.showPatientListLoader = true;
      const params = {
        startDate: this.toDateString(this.startDate),
        endDate: this.toDateString(this.endDate),
        locations: this.getSelectedLocations(this.patientListLocationUuids),
        indicators: this.currentIndicator,
        isLegacy: this.isLegacyReport
      };
      // console.log('loading pl for', this.patientListLocationUuids);
      // console.log('loading pl for', this.currentIndicator);
      this.router.navigate(['patient-list']
        , {
          relativeTo: this.route,
          queryParams: params
        });
    }
  }

  public toggleMohTables() {
    this.showPatientList = false;
    this.showTabularView = true;
    this.showPatientListLoader = false;
    this.currentIndicator = '';
    this.patientListLocationUuids = [];
  }

  public onLoadCompleted(complete) {
    this.showPatientListLoader = false;
    this.showPatientList = true;
  }

  public onTabChanged(event) {
    if (event.index === 0) {
      this.currentView = 'pdf';
      if (this.pdfView && this.pdfView.generatePdf) {
        this.pdfView.generatePdf();
      }

    }

    if (event.index === 1) {
      this.currentView = 'tabular';
    }
  }

  private getSelectedLocations(locationUuids: any): string {
    if (!locationUuids || locationUuids.length === 0) {
      return '';
    }

    let selectedLocations = '';

    for (let i = 0; i < locationUuids.length; i++) {
      if (i === 0) {
        selectedLocations = selectedLocations + (locationUuids[0] as any).value;
      } else {
        selectedLocations = selectedLocations + ',' + (locationUuids[i] as any).value;
      }
    }
    return selectedLocations;
  }

  private toDateString(date: Date): string {
    return Moment(date).utcOffset('+03:00').format();
  }
  private processInfoMsg(message: any, isEmpty: boolean = false) {

    if (message.error === 404 || isEmpty) {
      // this.errorMessage =
      // 'The MOH 731 Report cannot be viewed at the moment, awaiting M & E verification';
      // this.statusError = true;
    } else {
      this.errorMessage = 'There was a problem generating MOH 731 Report';
    }

  }
}
