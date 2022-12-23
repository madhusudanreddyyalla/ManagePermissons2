import { LightningElement, track, api, wire } from 'lwc';
import getFieldPermissions from '@salesforce/apex/ManageFieldPermissionsController.getFieldPermissions';
import updateFieldPermissions from '@salesforce/apex/ManageFieldPermissionsController.updateFieldPermissions';
import getmanagePermissionsMdt from '@salesforce/apex/ManageFieldPermissionsController.managePermissionsMdt';
import getRestResponse from '@salesforce/apex/ManagePermissionsUtility.getRestResponse';
import FieldPermissionRetrieveSuccess from '@salesforce/label/c.FieldPermissionRetrieveSuccess';
import FieldPermissionSaveFailed from '@salesforce/label/c.FieldPermissionSaveFailed';
import FieldPermissionSaveSuccess from '@salesforce/label/c.FieldPermissionSaveSuccess';
import SelectObjectLabel from '@salesforce/label/c.SelectObjectLabel';
import SelectObjectWarning from '@salesforce/label/c.SelectObjectWarning';
import SelectProfileandPermissionSetLabel from '@salesforce/label/c.SelectProfileandPermissionSetLabel';
import SelectProfileandPermissionSetwarning from '@salesforce/label/c.SelectProfileandPermissionSetwarning';
import ManageFieldChunk from '@salesforce/label/c.ManageField';
import MassFieldSaveChunk from '@salesforce/label/c.MassFieldSaveChunk';
import fetchData from '@salesforce/label/c.Fetch_Mass_Permission_Data';
import saveData from '@salesforce/label/c.MassPermissionsSaveButton';



export default class Lwc_ManageFieldPermissions extends LightningElement {
    labels = { FieldPermissionRetrieveSuccess, FieldPermissionSaveFailed, FieldPermissionSaveSuccess, SelectProfileandPermissionSetLabel, SelectObjectLabel, SelectObjectWarning, SelectProfileandPermissionSetwarning, ManageFieldChunk, MassFieldSaveChunk, fetchData, saveData }

    @api accessToken;
    @api baseUrl;
    @api baseOrgType = 'Production';
    @track autoCloseTime = 3000;
    @track selectedObject;
    @track testoptions = '';
    @track permissionList;
    @track sObject = [];
    @track permission = [];
    @track searchActivity;
    @track allObjects = {};
    @track allProfilesandPermissionset = [];
    @track getAllObjects;
    @track getSelectedObjFields;
    @track getobj = [];
    @track isProfile = false;
    @track isObject = false;
    @track isfieldsvisible = false;
    @track allFields;
    @track allStandardFields = [];
    @track objectselected;
    @track fieldPermissionsList = [];
    @track columns = [];
    @track updatedFiledPermission = [];
    @track selectedProfilesandPS;
    @track updatedFieldPermissionJsonString;
    @track managePermissionMDT;
    @track allObjectFields;
    // Source of truth to revert back to on `edit all` and `read all` change.
    fieldPermissionsListSource = [];
    isFieldPermissionVisible = false;
    isdataFetched;
    isSpinner = false;
    isFetch = true;
    @track hideObjects;
    @track allPermissionsResponseData = [];
    @track errorMessage = null;
    @track errorType;
    @track isAllRead = false;
    @track isAllEdit = false;


    async connectedCallback() {
        this.isSpinner = true;

        await getmanagePermissionsMdt().then((result) => {
            this.managePermissionMDT = result;
            this.hideObjects = this.managePermissionMDT.Hide_Objects__c.replaceAll(/\s/g, '').split(',');
        }).catch((err) => {
            this.isSpinner = false;
            this.showToast('error', JSON.stringify(err));
        });

        let getAllObjectsData = {
            accessToken: this.accessToken,
            baseUrl: this.baseUrl,
            queryString: 'tooling/query/?q=Select+id,Label,QualifiedApiName,RecordTypesSupported+from+EntityDefinition+where+IsCustomizable=true+and+IsCustomSetting=false+and+IsEverCreatable=true+and+DefaultCompactLayoutId!=null+and+IsSearchable=true+and+IsWorkflowEnabled=true+order+by+label',
            method: 'GET',
        }

        getRestResponse({ jsonDataStr: JSON.stringify(getAllObjectsData) })
            .then((result) => {
                let objrecords = JSON.parse(result).records;

                for (let i = 0; i < objrecords.length; i++) {
                    objrecords = objrecords.filter(e => !this.hideObjects.includes(e.QualifiedApiName));
                    this.getobj.push({
                        label: objrecords[i].Label + ' (' + objrecords[i].QualifiedApiName + ')',
                        value: objrecords[i].QualifiedApiName
                    });

                }
                // this.getobj = this.getobj.sort((a, b) => a.Label.localeCompare(b.Label));
                this.isObject = true;
                this.isSpinner = this.isProfile && this.isObject ? false : true;
            }).catch((err) => {
                this.isSpinner = false;
                this.autoCloseTime = 4000;
                this.showToast('error', JSON.stringify(err));
            });


        let getAllProfilePermissionSetjson = {
            accessToken: this.accessToken,
            baseUrl: this.baseUrl,
            queryString: 'query/?q=SELECT+Id,name,label,PermissionSet.Profile.Name,ProfileId+FROM+PermissionSet',
            method: 'GET',
        }

        getRestResponse({ jsonDataStr: JSON.stringify(getAllProfilePermissionSetjson) })
            .then((result) => {
                let records = JSON.parse(result).records;
                let hidePermissions = this.managePermissionMDT.Hide_Permissions__c.replaceAll(/\s/g, '').split(',');

                for (let i = 0; i < records.length; i++) {
                    if (records[i].ProfileId != null || records[i].ProfileId != undefined) {
                        records = records.filter(record => !hidePermissions.includes(record.Name))

                        this.allProfilesandPermissionset.push({
                            label: records[i].Profile.Name + '(Profile)',
                            value: records[i].Id
                        });
                    } else {
                        this.allProfilesandPermissionset.push({
                            label: records[i].Label + '(Permission Set)',
                            value: records[i].Id
                        });
                    }
                }
                this.allProfilesandPermissionset = this.allProfilesandPermissionset.sort((a, b) => a.label.localeCompare(b.label));
                this.isProfile = true;
                this.isSpinner = this.isProfile && this.isObject ? false : true;

            }).catch((err) => {
                this.isSpinner = false;
                this.autoCloseTime = 4000;
                this.showToast('error', JSON.stringify(err));
            });
    }


    buttonSelectObject(event) {
        let selectedvalues = event.detail.payload;
        let previousSelection = this.objectselected;
        this.objectselected = selectedvalues.value;
        if (selectedvalues.value != null && selectedvalues.value != undefined && previousSelection != this.objectselected) {
            this.allFields = null;
            //this.isSpinner = true;
            this.allObjects['objectName'] = selectedvalues.value;
        }

    }
    buttonSelect(event) {
        let selectedvalues = event.detail.payload;
        let multiselect = event.detail.payloadType;
        if (multiselect == 'multi-select') {
            this.allObjects['selectedIdList'] = selectedvalues.values;
        }
    }

    async fetchFieldPermissions() {
        //clear old data
        
        this.allPermissionsResponseData = [];

        if (this.allObjects.objectName == undefined && this.allObjects.objectName == null) {
            this.isSpinner = false;
            this.showToast('error', this.labels.SelectObjectWarning);

        } else if ((this.allObjects.selectedIdList == undefined && this.allObjects.selectedIdList == null) || this.allObjects.selectedIdList.length == 0) {
            this.isSpinner = false;
            this.showToast('error', this.labels.SelectProfileandPermissionSetwarning);
        } else {
            this.allFields = null;
            this.errorMessage = null;
            this.errorType = null;
            this.fieldPermissionsList=[];
            this.isFieldPermissionVisible=false;
            //first fetch fields of selected object

            //fetch field permissions
            this.isSpinner = true;
            let getObjectFields = {
                accessToken: this.accessToken,
                baseUrl: this.baseUrl,
                queryString: 'tooling/query/?q=SELECT+id,Name,Label,DataType,IsCreatable,IsUpdatable,IsCalculated+FROM+EntityParticle+WHERE+EntityDefinition.QualifiedApiName' + '=\'' + this.allObjects['objectName'] + '\'+AND+IsLayoutable=true',
                method: 'GET',
            }

            getRestResponse({ jsonDataStr: JSON.stringify(getObjectFields) })
                .then((result) => {
                    let fieldsRecord = JSON.parse(result).records;
                    this.allObjectFields = fieldsRecord.filter(e => !this.managePermissionMDT.Hide_Fields__c.includes(e.Name));
                }).catch((err) => {
                    this.isSpinner = false;
                    this.autoCloseTime = 4000;
                    this.showToast('error', JSON.stringify(err));
                });

            this.selectedProfilesandPS = this.allProfilesandPermissionset.filter(u => this.allObjects.selectedIdList.includes(u.value))

            let allObjectSelectedList = JSON.parse(JSON.stringify(this.allObjects.selectedIdList));
            let chunks = new Array(Math.ceil(allObjectSelectedList.length / this.labels.ManageFieldChunk)).fill().map(_ => { return { objectName: this.allObjects.objectName, selectedIdList: allObjectSelectedList.splice(0, this.labels.ManageFieldChunk) } });
            this.recursivePromiseChainHandler(chunks, this);
        }
    }
    fieldUpdate(event) {
        var fieldLabel = event.target.dataset.fieldlabel;
        var permissionName = event.target.dataset.permissionname;
        var isChecked = event.target.checked;
        var trasactionType = event.target.value;
        //var trasactionId = event.target.dataset.fieldval;
        var parentId = event.target.dataset.permissionid;

        for (let i = 0; i < this.fieldPermissionsList.length; i++) {
            if (this.fieldPermissionsList[i].fieldlabel == fieldLabel) {
                this.fieldPermissionsList[i].isModified = true;
                for (let j = 0; j < this.fieldPermissionsList[i].permissionList.length; j++) {
                    if (this.fieldPermissionsList[i].permissionList[j].name == permissionName) {

                        if (trasactionType == 'permissionsRead') {
                            this.fieldPermissionsList[i].permissionList[j].read = isChecked;
                            if (isChecked == false) {
                                this.fieldPermissionsList[i].permissionList[j].edit = false;
                            }
                        }
                        if (trasactionType == 'permissionsEdit') {
                            this.fieldPermissionsList[i].permissionList[j].edit = isChecked;
                            if (isChecked == true) {
                                this.fieldPermissionsList[i].permissionList[j].read = isChecked;
                            }
                        }
                        //let isUpdated = this.fieldPermissionsList[i].permissionList[j].isModified;
                        this.fieldPermissionsList[i].permissionList[j].isModified = true;
                        break;
                    }
                }

            }
        }
    }

    //Handle checkbox click
    selectOrDeselectAllPermissions(event) {
        if (event.target.dataset.scope == 'REVERT') {
            this.fieldPermissionsList = JSON.parse(JSON.stringify(this.fieldPermissionsListSource));
            this.template.querySelector('[data-scope="READ_ALL"]').checked = false;
            this.template.querySelector('[data-scope="EDIT_ALL"]').checked = false;
            this.template.querySelectorAll(`[data-scope="READ_ALL_C"]`).forEach(eachElement => {
                eachElement.checked = false;
            })

            this.template.querySelectorAll(`[data-scope="EDIT_ALL_C"]`).forEach(eachElement => {
                eachElement.checked = false;
            })
        }
        let accessType = event.target.dataset.scope;
        let isChecked = event.target.checked;

        let isCategory = false;
        let value = '';
        if (accessType.indexOf('_C') != -1) {
            isCategory = true;
            value = event.target.dataset.id;
        }

        this.fieldPermissionsList.forEach(eachFieldPermission => {
            eachFieldPermission.permissionList.forEach(eachPermission => {
                if (isCategory & eachPermission.parentId == value) {
                    eachFieldPermission.isModified = true;
                    switch (accessType) {
                        case 'EDIT_ALL_C':
                            eachPermission.edit = isChecked;
                            eachPermission.isModified = true;
                            //Donot remove read access on removal of edit access
                            if (isChecked) {
                                eachPermission.read = isChecked;
                                this.template.querySelectorAll(`[data-id="${value}"]`).forEach(queriedNode => {
                                    if (queriedNode.attributes.getNamedItem('data-scope').value == 'READ_ALL_C') {
                                        queriedNode.checked = isChecked;
                                    }
                                })
                            }
                            break;

                        case 'READ_ALL_C':
                            eachPermission.read = isChecked;
                            eachPermission.isModified = true;
                            if (isChecked == false) {
                                eachPermission.edit = false;
                                this.template.querySelectorAll(`[data-id="${value}"]`).forEach(queriedNode => {
                                    if (queriedNode.attributes.getNamedItem('data-scope').value == 'EDIT_ALL_C') {
                                        queriedNode.checked = false;
                                    }
                                })
                            }
                            break;
                    }
                }
                //Global Edit and Read All
                switch (accessType) {
                    case 'EDIT_ALL':
                        eachFieldPermission.isModified = true;
                        eachPermission.edit = isChecked;
                        eachPermission.isModified = true;
                        this.template.querySelectorAll(`[data-scope="EDIT_ALL_C"]`).forEach(eachElement => {
                            eachElement.checked = isChecked;
                        })
                        //Donot remove read access on removal of edit access
                        if (isChecked) {
                            eachPermission.read = isChecked;
                            this.template.querySelector('[data-scope="READ_ALL"]').checked = isChecked;
                            this.template.querySelectorAll(`[data-scope="READ_ALL_C"]`).forEach(eachElement => {
                                eachElement.checked = isChecked;
                            })
                        }
                        break;

                    case 'READ_ALL':
                        eachFieldPermission.isModified = true;
                        eachPermission.read = isChecked;
                        eachPermission.isModified = true;
                        this.template.querySelectorAll(`[data-scope="READ_ALL_C"]`).forEach(eachElement => {
                            eachElement.checked = isChecked;
                        })
                        if (!isChecked) {
                            eachPermission.edit = isChecked;
                            this.template.querySelector('[data-scope="EDIT_ALL"]').checked = isChecked;
                            this.template.querySelectorAll(`[data-scope="EDIT_ALL_C"]`).forEach(eachElement => {
                                eachElement.checked = isChecked;
                            })
                        }
                        break;
                }
            })
        })
    }

    /**
     * Recursively handle chained promises one after the other. Used to asynchronously handle data in multiple iterations. 
     * @param {Object[]} chunkedDataContainer Array of chunks of data to be handled asynchronously one after the other.
     * @param {this} self Context 
     */
    recursivePromiseChainHandler(chunkedDataContainer, self) {
        let currentChunk = chunkedDataContainer.shift();
        if (currentChunk) {
            // Using a flag `isFetch` to differentiate between fetch and save operations.
            if (self.isFetch) {
                self.processPermissions(currentChunk, self).then(_ => self.recursivePromiseChainHandler(chunkedDataContainer, self));
            } else {
                // Saving the chunk here
                self.processSavePermission(currentChunk, self).then(_ => self.recursivePromiseChainHandler(chunkedDataContainer, self));
            }
        } else {
            if (self.isFetch) {
                self.handlePermissionData(self);
                self.isFieldPermissionVisible = true;
            } else {
                self.isFetch = true;
                this.fetchFieldPermissions();
            }
            self.isSpinner = false;
        }
    }

    /**
     * Fetch permissions for a given set of profiles or permission sets. Returns a promise that resolves when the explicit apex call succeeds.
     * @param {Object[]} chunk Information regarding the data to be fetched as part of the call.
     * @param {this} self Context 
     * @returns Returns a promise that resolves when the explicit apex call succeeds and is rejected when the call fails.
     */
    processPermissions(chunk, self) {
        return new Promise((resolve, reject) => {
            getFieldPermissions({
                accessToken: self.accessToken,
                baseUrl: self.baseUrl,
                jsonDataStr: JSON.stringify(chunk)
            })
                .then(response => {
                    resolve();
                    let records = JSON.parse(response).records
                    this.allPermissionsResponseData = [...this.allPermissionsResponseData, ...records];
                    //  self.handlePermissionData(response, self);
                })
                .catch(error => {
                    reject();
                    this.autoCloseTime = 4000;
                    self.handleError(error);

                })
        })
    }

    /**
     * Save / Update permissions for a given set of profiles or permission sets. Returns a promise that resolves when the explicit apex call succeeds.
     * @param {Object[]} chunk Information regarding the data to be saved as part of the call.
     * @param {this} self Context 
     * @returns Returns a promise that resolves when the explicit apex call succeeds and is rejected when the call fails.
     */
    processSavePermission(chunk, self) {
        return new Promise((resolve, reject) => {
            updateFieldPermissions({
                accessToken: self.accessToken,
                baseUrl: self.baseUrl,
                jsonInputString: JSON.stringify(chunk)
            })
                .then(response => {
                    let isSuccess = JSON.parse(response).compositeResponse;

                    isSuccess = isSuccess.find(element => element.httpStatusCode != 201 && element.httpStatusCode != 204);
                    if (isSuccess) {
                        this.errorMessage = isSuccess.body[0].message;
                        this.errorType = 'error';
                        this.showToast(this.errorType, this.errorMessage);
                    }
                    else {
                        this.errorMessage = this.errorMessage == null ? this.labels.FieldPermissionSaveSuccess : this.errorMessage;
                        this.errorType = this.errorType == undefined ? 'success' : this.errorType;
                        this.showToast(this.errorType, this.labels.FieldPermissionSaveSuccess);
                    }
                    resolve();

                })
                .catch(error => {
                    this.isSpinner = false;
                    reject()
                    self.handleError(error);
                })
        })
    }

    handlePermissionData(self) {
        if(!this.isFetch)
        this.showToast('success', this.labels.FieldPermissionRetrieveSuccess);
        //let permissions = JSON.parse(response).records;
        let permissions = this.allPermissionsResponseData;
        let objectName = this.allObjects.objectName;
        let fieldArray = [];
        self.isdataFetched = true;
        // let permissionLabel;
        self.allObjectFields.forEach(field => {
            let fieldApiNames = objectName + '.' + field.Name;
            var permissionsRelatedToTheField = permissions.filter(eachPermission => eachPermission.Field == fieldApiNames);
            var permissionList = [];
            self.selectedProfilesandPS.forEach(eachPermission => {
                //   permissionLabel = eachPermission.label;
                let permissionRec = [];
                if (permissionsRelatedToTheField) {
                    permissionsRelatedToTheField.forEach(rec => {
                        if (rec.Parent.attributes.url.includes(eachPermission.value)) {

                            permissionRec.push(rec);
                        }
                    });
                }
                if (permissionRec.length != 0) {
                    permissionList.push({
                        read: permissionRec[0].PermissionsRead,
                        edit: permissionRec[0].PermissionsEdit,
                        fieldId: permissionRec[0].Id,
                        name: eachPermission.label,
                        parentId: eachPermission.value,
                        isModified: false
                    });
                } else {
                    permissionList.push({
                        read: false,
                        edit: false,
                        fieldId: '',
                        name: eachPermission.label,
                        parentId: eachPermission.value,
                        isModified: false
                    });
                }
            })
            let preventEditField = ['reference', 'Formula'];
            let dataType = field?.DataType ? field.DataType : '-';
            if (dataType == 'string' || dataType == 'String') {
                dataType = 'Text';
            } else if (dataType == 'boolean' || dataType == 'Boolean') {
                dataType = 'Checkbox';
            } else if (dataType == 'int' || dataType == 'Integer') {
                dataType = 'Number';
            }
            let fieldData =
                [{
                    "fieldlabel": field?.Label ? (field.Label + ' (' + field.Name + ')') : field.Name + ' (' + field.Name + ')',
                    "fieldApi": field.Name,
                    "datatype": dataType,
                    "read": false,
                    "edit": false,
                    //  "permissionLabel" : permissionLabel,
                    "restrictEdit": preventEditField.includes(field.DataType) ? true : false,
                    "permissionList": permissionList,
                    "isModified": false

                }];
            fieldArray.push(...fieldData);
        });
        self.fieldPermissionsList = fieldArray.sort((a, b) => a.fieldlabel.localeCompare(b.fieldlabel));
        self.fieldPermissionsListSource = JSON.parse(JSON.stringify(fieldArray));
         console.log('fieldPermissionsList_JsonFormat==>',JSON.stringify(self.fieldPermissionsList));

        if (!self.isFieldPermissionVisible) {
            self.isFieldPermissionVisible = true;
        }
    }

    handleError(error) {
        this.autoCloseTime = 4000;
        this.isSpinner = false;
        this.showToast('error', JSON.stringify(error));
    }

    async savefieldPermissions() {
        this.isSpinner = true;
        var compositeRequestList = [];
        var updatedFieldPermissionList = this.fieldPermissionsList.filter(fieldElement => fieldElement.isModified == true)
        updatedFieldPermissionList.forEach(elementField => {
            var updatedFieldPermissionData = elementField.permissionList.filter(e => e.isModified == true)

            updatedFieldPermissionData.forEach(element => {
                if (element.fieldId != '' && element.fieldId != undefined) {

                    var compositeRequest = {
                        "method": "PATCH",
                        "referenceId": "UpdateFieldPermissions" + element.fieldId,
                        "url": "/services/data/v56.0/sobjects/FieldPermissions/" + element.fieldId,
                        "body": {
                            "PermissionsEdit": element.edit,
                            "PermissionsRead": element.read
                        }
                    }
                    compositeRequestList.push(compositeRequest);
                }
                else {
                    var compositeRequest = {
                        "method": "POST",
                        "referenceId": "NewFieldPermissions" + elementField.fieldApi + element.parentId,
                        "url": "/services/data/v56.0/sobjects/FieldPermissions",
                        "body": {
                            "SobjectType": this.allObjects.objectName,
                            "Field": this.allObjects.objectName + '.' + elementField.fieldApi,
                            "ParentId": element.parentId,
                            "PermissionsEdit": element.edit,
                            "PermissionsRead": element.read

                        }
                    }
                    compositeRequestList.push(compositeRequest);
                }
            })
        })
        this.updatedFieldPermissionJsonString = {
            "allOrNone": false,
            "compositeRequest": compositeRequestList
        }

        this.isFetch = false;
        this.recursivePromiseChainHandler(new Array(Math.ceil(compositeRequestList.length / this.labels.MassFieldSaveChunk)).fill().map(_ => { return { allOrNone: false, compositeRequest: compositeRequestList.splice(0, this.labels.MassFieldSaveChunk) } }), this);
    }

    passUpdateFieldPermissions() {

        updateFieldPermissions({ accessToken: this.accessToken, baseUrl: this.baseUrl, jsonInputString: JSON.stringify(this.updatedFieldPermissionJsonString) })
            .then((result) => {
                this.isSpinner = false;
            }).catch((err) => {
                this.isSpinner = false;
                this.autoCloseTime = 4000;
                this.showToast('error', this.labels.FieldPermissionSaveFailed);
            });
    }
    profileandPermissionfieldsUpdate(event) {
        console.log('inside profileandPermissionfieldsUpdate');
        let checked = event.target.checked;
        let fieldApiName = event.target.dataset.fieldvalue;
        console.log('fieldApiName', fieldApiName);
        let selectedPermission = event.target.dataset.selected;
        this.fieldPermissionsList.forEach(element => {
            if (element.fieldApi == fieldApiName) {
                element.isModified = true;
                element.permissionList.forEach(permission => {
                    if (selectedPermission == 'AllRead') {
                        console.log('AllRead', permission);
                        permission.read = checked;
                        permission.isModified = checked;
                        if(!checked){
                         permission.edit = checked;
                         console.log('Read element.edit',element.edit);
                            element.edit = checked;
                        }
                    } else if (selectedPermission == 'AllEdit') {
                        if (checked) {
                            permission.read = checked;
                            permission.edit = checked;
                             if (element.fieldApi == fieldApiName) {
                                 console.log('Edit element.edit',element.edit);
                                 element.read = checked;
                           // this.isAllRead = checked;
                             }
                            permission.isModified = checked;
                        } else {
                            permission.edit = checked;
                            permission.isModified = checked;
                        }
                    }
                })
            }
        })
    }

    showToast(type, message) {
        this.template.querySelector('c-custom-toast').showToast(type, message);
    }

}