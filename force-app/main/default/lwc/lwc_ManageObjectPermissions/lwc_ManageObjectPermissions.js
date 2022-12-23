import { LightningElement, track, api } from 'lwc';
import getRestResponse from '@salesforce/apex/ManagePermissionsUtility.getRestResponse';
import getObjectsPermissions from '@salesforce/apex/ManageObjectPermissionsController.getObjectsPermissions';
import readRecordtypeAccess from '@salesforce/apex/ManageObjectPermissionsController.readRecordtypeAccess';
import getRecordTypePermissions from '@salesforce/apex/ManageObjectPermissionsController.getRecordTypePermissions';
import updateObjectPermissions from '@salesforce/apex/ManageObjectPermissionsController.updateObjectPermissions';
import updateRecordTypePermissions from '@salesforce/apex/ManageObjectPermissionsController.updateRecordTypePermissions';
import getmanagePermissionsMdt from '@salesforce/apex/ManageFieldPermissionsController.managePermissionsMdt';
import SelectObjectLabel from '@salesforce/label/c.SelectObjectLabel';
import SelectObjectWarning from '@salesforce/label/c.SelectObjectWarning';
import SelectProfileandPermissionSetLabel from '@salesforce/label/c.SelectProfileandPermissionSetLabel';
import SelectProfileandPermissionSetwarning from '@salesforce/label/c.SelectProfileandPermissionSetwarning';
import NoChanges from '@salesforce/label/c.Manage_Save_Changes';
import changesSaved from '@salesforce/label/c.Mass_Object_Saved';
import MassObjectFetchChunk from '@salesforce/label/c.MassObjectFetchChunk';
import MassObjectSaveChunk from '@salesforce/label/c.MassObjectSaveChunk';
import fetchData from '@salesforce/label/c.Fetch_Mass_Permission_Data';
import saveData from '@salesforce/label/c.MassPermissionsSaveButton';

export default class RecordTypeAccessibiltyParent extends LightningElement {
  labels = { SelectObjectLabel, SelectObjectWarning, SelectProfileandPermissionSetLabel, SelectProfileandPermissionSetwarning, NoChanges, changesSaved, MassObjectFetchChunk, MassObjectSaveChunk, fetchData, saveData }
  @api accessToken;
  @api baseUrl;
  @api baseOrgType;
  @track allProfilesandPermissionset = [];
  @track allProfilesandPermissionsetDuplicate = [];
  @track allObjects = {};
  @track selectedProfilesandPS;
  @track getobj = [];
  @track objectPermissionList = [];
  @track selectedObjectPermissions = [];
  @track isSpinner = false;
  @track recordTypeList = [];
  // Each object represent a profile / a permission set with all the recordtype permissions and object permissions.
  @track tableData = [];
  @track updatedObjectPermissionJsonString = {}; // previously initialized as an empty array.
  @track newRecordTypeAccessList = [];
  @track recordTypesofObject;
  @track tableDataSource = [];
  @track isBothPermissions = false;
  @track errorMessage;
  @track errorType;
  @track hideObjects = [];
  @track readAll = false;
  @track createAll = false;
  @track editAll = false;
  @track deleteAll = false;
  @track viewAll = false;
  @track modifyAll = false;

  @track isdataFetched = false;
  @track fetchUpdatedSize = {};
  @track objectSize;
  @track recordTypeSize;
  @track autoCloseTime = 3000;
  standardProfile = {
    'System Administrator': 'Admin', 'Standard Platform User': 'StandardAul', 'High Volume Customer Portal': 'HighVolumePortal',
    'Solution Manager': 'SolutionManager', 'Marketing User': 'MarketingProfile', 'Contract Manager': 'ContractManager',
    'Standard User': 'Standard'
  };
  isSelectAll = false;
  isProfile = false;
  isObject = false;
  isRecordTypeSaveDone = false;
  isObjectTypeSaveDone = false;
  isObjectTypeRecurrsion = true;

  async connectedCallback() {
    this.isSpinner = true;
    await getmanagePermissionsMdt().then((result) => {
      this.managePermissionMDT = result;
      this.hideObjects = this.managePermissionMDT.Hide_Objects__c.replaceAll(/\s/g, '').split(',');
    }).catch((err) => {
      this.autoCloseTime = 6000;
      this.showToast('error', JSON.stringify(err));
    });

    //Fetch all the profiles and permission sets from the org
    let getProfileAndPermissionSetJson = {
      accessToken: this.accessToken,
      baseUrl: this.baseUrl,
      queryString: 'query/?q=SELECT+Id,name,label,PermissionSet.Profile.Name,ProfileId+FROM+PermissionSet',
      method: 'GET',
    }

    getRestResponse({ jsonDataStr: JSON.stringify(getProfileAndPermissionSetJson) })
      .then((result) => {
        let records = [];
        records = JSON.parse(result).records;
        //Remove unwanted profiles and permission sets
        let hidePermissions = this.managePermissionMDT.Hide_Permissions__c.replaceAll(/\s/g, '').split(',');
        records = (hidePermissions != null && hidePermissions != undefined && hidePermissions.length > 0) ?
                  records.filter(record => !hidePermissions.includes(record.Name)) : records;
        if (records != undefined && records != null) {
          for (let i = 0; i < records.length; i++) {
            if (records[i].ProfileId != null || records[i].ProfileId != undefined) {
              this.allProfilesandPermissionset.push({
                label: records[i].Profile.Name,
                permissionApiName: this.standardProfile[records[i].Profile.Name] != undefined ? this.standardProfile[records[i].Profile.Name] : records[i].Profile.Name,
                type: 'Profile',
                value: records[i].Id
              });
              this.allProfilesandPermissionsetDuplicate.push({
                label: records[i].Profile.Name + ' (' + 'Profile' + ')',
                value: records[i].Id
              })
            } else {
              this.allProfilesandPermissionset.push({
                label: records[i].Label,
                permissionApiName: records[i].Name,
                type: 'PermissionSet',
                value: records[i].Id
              })
              this.allProfilesandPermissionsetDuplicate.push({
                label: records[i].Label + ' (' + 'PermissionSet' + ')',
                value: records[i].Id
              });
            }
          }
        }
        //Sort data
        this.allProfilesandPermissionsetDuplicate = this.allProfilesandPermissionsetDuplicate.sort((a, b) => a.label.localeCompare(b.label));
        this.isProfile = true;
        this.isSpinner = this.isProfile && this.isObject ? false : true;
      }).catch((err) => {
        this.autoCloseTime = 4000;
        this.isSpinner = false;
        this.showToast('error', JSON.stringify(err));
      });

    //Fetch all the objects from the org
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
          //Remove unwanted objects
          objrecords = (this.hideObjects != null &&  this.hideObjects != undefined && this.hideObjects.length >0) ?
                        objrecords.filter(e => !this.hideObjects.includes(e.QualifiedApiName)) : objrecords;
          this.getobj.push({
            label: objrecords[i].Label + ' (' + objrecords[i].QualifiedApiName + ')',
            value: objrecords[i].QualifiedApiName
          });

        }
        this.isObject = true;
        this.isSpinner = this.isProfile && this.isObject ? false : true;
      }).catch((err) => {
        this.isSpinner = false;
        this.autoCloseTime = 4000;
        this.showToast('error', JSON.stringify(err));
      });
  }

  //To identify whether object and record type permissions are saved.
  get isSaveDone() {
    return this.isObjectTypeSaveDone && this.isRecordTypeSaveDone;
  }

  saveRecordTypeRecursionHandler(chunkedDataContainer, self) {
    let currentChunk = chunkedDataContainer.shift();
    if (currentChunk) {
      self.passUpdateRecordTypePermissions(currentChunk, self).then(_ => self.saveRecordTypeRecursionHandler(chunkedDataContainer, self));
    } else {
      self.isRecordTypeSaveDone = true;
      this.clearAll();
    }
  }

  saveObjectPermissionRecursionHandler(chunkedDataContainer, self) {
    let currentChunk = chunkedDataContainer.shift();
    if (currentChunk) {
      self.passUpdateobjectPermissions(currentChunk, self).then(_ => self.saveObjectPermissionRecursionHandler(chunkedDataContainer, self));
    } else {
      self.isObjectTypeSaveDone = true;
    }
  }

  passUpdateRecordTypePermissions(currentChunk, self) {
    currentChunk = currentChunk.filter(element => element.name != this.allObjects.objectName + '.Master');
    return new Promise((resolve, reject) => {
      updateRecordTypePermissions({
        accessToken: self.accessToken,
        baseUrl: self.baseUrl,
        jsonInputString: JSON.stringify(currentChunk)
      })
        .then(result => {
          resolve()
        })
        .catch(error => {
          reject()
          this.autoCloseTime = 4000;
          this.showToast('error', JSON.stringify(error)); ''
          this.isSpinner = false;
        })
    })
  }

  clearAll() {
    this.errorMessage = this.errorMessage ? this.errorMessage : this.labels.changesSaved;
    this.errorType = this.errorType ? this.errorType : 'success';

    if (this.objectSize && this.recordTypeSize) {
      if (this.isObjectTypeSaveDone && this.isRecordTypeSaveDone) {
        this.showToast(this.errorType, this.errorMessage);
        this.fetchRecordTypePermissions();
      }
    } else if (this.objectSize && (this.recordTypeSize == 0 || this.recordTypeSize == undefined || this.recordTypeSize == null)) {
      if (this.isObjectTypeSaveDone) {
        this.showToast(this.errorType, this.errorMessage);
        this.fetchRecordTypePermissions();
      }
    } else if ((this.objectSize == 0 || this.objectSize == null || this.objectSize == undefined) && this.recordTypeSize) {
      if (this.isRecordTypeSaveDone) {
        this.showToast(this.errorType, this.errorMessage);
        this.fetchRecordTypePermissions();
      }
    } else {
      this.isSpinner = false;
    }
  }

  passUpdateobjectPermissions(currentChunk, self) {
    return new Promise((resolve, reject) => {
      updateObjectPermissions({
        accessToken: self.accessToken,
        baseUrl: self.baseUrl,
        jsonInputString: JSON.stringify(currentChunk)
      })
        .then(result => {

          let isSuccess = JSON.parse(result).compositeResponse;
          isSuccess = isSuccess.find(element => element.httpStatusCode != 204);

          if (isSuccess) {
            this.errorMessage = isSuccess.body[0].message;
          }
          if (isSuccess) {
            this.errorType = 'error';
            this.autoCloseTime = 6000;
            this.clearAll();
          } else {
            this.errorMessage = this.labels.changesSaved;
            this.errorType = 'success';
            this.autoCloseTime = 3000;
            this.clearAll();
          }
        })
      resolve()
        .catch(error => {
          reject()
          this.isSpinner = false;
          this.autoCloseTime = 4000;
          this.showToast('error', JSON.stringify(error));
        });
    })
  }

  recursivePromiseChainHandler(chunkedDataContainer, self) {
    let currentChunk = chunkedDataContainer.shift();

    if (currentChunk) {
      if (self.isObjectTypeRecurrsion) {
        self.getObjectPermissions(currentChunk, self).then(_ => self.recursivePromiseChainHandler(chunkedDataContainer, self));
      } else {
        self.getRecordTypePermissions(currentChunk, self).then(_ => self.recursivePromiseChainHandler(chunkedDataContainer, self));
      }
    } else {
      if (self.isObjectTypeRecurrsion) {
        self.isObjectTypeRecurrsion = false;
        self.createTableData(self);
        let chuckedRecordTypeInfoContainer = new Array(Math.ceil(self.selectedProfilesandPS.length / this.labels.MassObjectFetchChunk)).fill().map(_ => self.selectedProfilesandPS.splice(0, this.labels.MassObjectFetchChunk))
        self.recursivePromiseChainHandler(chuckedRecordTypeInfoContainer, self);
      } else {
        self.isSpinner = false;
        self.isdataFetched = true;
      }
    }
  }

  getRecordTypePermissions(currentChunk, self) {
    return new Promise((resolve, reject) => {
      readRecordtypeAccess({
        accessToken: self.accessToken,
        baseUrl: self.baseUrl,
        jsonProfilesAndPSData: JSON.stringify(currentChunk)
      })
        .then(result => {
          self.processRecordTypeData(result, self)
          resolve()
        })
        .catch(error => {
          reject()
          this.isSpinner = false;
          this.autoCloseTime = 4000;
          this.showToast('error', JSON.stringify(error));
        })
    })
  }

  getObjectPermissions(currentChunk, self) {
    let getObjectsPermiss = {
      accessToken: this.accessToken,
      baseUrl: this.baseUrl,
      method: 'GET',
    }

    return new Promise((resolve, reject) => {
      getObjectsPermissions({
        jsonDataStr: JSON.stringify(getObjectsPermiss),
        selectedObjectNames: currentChunk.objectName,
        selectedParentIds: currentChunk.selectedIdList
      })
        .then(result => {
          self.processObjectPermission(result, self);
          resolve();
        })
        .catch(error => {
          reject()
          this.autoCloseTime = 4000;
          this.showToast('error', JSON.stringify(error));
        })
    })
  }

  processObjectPermission(result, self) {
    var objectAccessData = JSON.parse(result).records;
    for (let i = 0; i < objectAccessData.length; i++) {
      if (objectAccessData[i].Id != undefined && objectAccessData[i].Id != null && !(self.objectPermissionList.includes(objectAccessData[i].Id))) {
        self.objectPermissionList.push({
          objectPermissionId: objectAccessData[i].Id,
          parentId: objectAccessData[i].ParentId,
          readAccess: objectAccessData[i].PermissionsRead,
          createAccess: objectAccessData[i].PermissionsCreate,
          editAccess: objectAccessData[i].PermissionsEdit,
          deleteAccess: objectAccessData[i].PermissionsDelete,
          viewAllAccess: objectAccessData[i].PermissionsViewAllRecords,
          modifyAllAccess: objectAccessData[i].PermissionsModifyAllRecords,
          objectName: objectAccessData[i].SobjectType,
          type: (objectAccessData[i].Parent.Profile == undefined && objectAccessData[i].Parent.Profile == null) ? 'PermissionSet' : 'Profile',
          profilePermissionName: (objectAccessData[i].Parent.Profile == undefined && objectAccessData[i].Parent.Profile == null) ? objectAccessData[i].Parent.Label : objectAccessData[i].Parent.Profile.Name,
          recordType: []
        })
      }
    }
  }

  // Making myTableData a global variable now as it's needed in multiple functions called at various points.
  myTableData = []
  createTableData(self) {
    self.selectedProfilesandPS = self.allProfilesandPermissionset.filter(u => self.allObjects.selectedIdList.includes(u.value));

    for (let i = 0; i < self.selectedProfilesandPS.length; i++) {
      let selectedObjectPerm = self.objectPermissionList.filter(objpermission => self.selectedProfilesandPS[i].value == objpermission.parentId)
      self.selectedObjectPermissions = [];
      if (selectedObjectPerm.length > 0) {
        self.selectedObjectPermissions.push({
          objectPermissionId: selectedObjectPerm[0].objectPermissionId,
          parentId: selectedObjectPerm[0].parentId,
          profileName: self.selectedProfilesandPS[i].label,
          readAccess: selectedObjectPerm[0].readAccess,
          createAccess: selectedObjectPerm[0].createAccess,
          editAccess: selectedObjectPerm[0].editAccess,
          deleteAccess: selectedObjectPerm[0].deleteAccess,
          viewAllAccess: selectedObjectPerm[0].viewAllAccess,
          modifyAllAccess: selectedObjectPerm[0].modifyAllAccess,
          objectName: selectedObjectPerm[0].objectName,
          type: selectedObjectPerm[0]?.type,
          isModified: false
        })
      } else {
        self.selectedObjectPermissions.push({
          objectPermissionId: '',
          profileName: self.selectedProfilesandPS[i].label,
          parentId: self.selectedProfilesandPS[i].value,
          readAccess: false,
          createAccess: false,
          editAccess: false,
          deleteAccess: false,
          viewAllAccess: false,
          modifyAllAccess: false,
          objectName: self.allObjects.objectName,
          type: selectedObjectPerm[0]?.type,
          isModified: false
        })
      }

      self.myTableData.push({
        profileName: self.selectedProfilesandPS[i].label + ' (' + self.selectedProfilesandPS[i].type + ')',
        profilePermissionAPIName: self.selectedProfilesandPS[i].permissionApiName,
        profileAPIName: self.selectedProfilesandPS[i].type == 'Profile' ? self.selectedProfilesandPS[i]?.permissionApiName : self.selectedProfilesandPS[i].label,
        type: self.selectedProfilesandPS[i].type,
        isObjectModified: false,
        isRecordTypeModified: false,
        objectPermission: self.selectedObjectPermissions
      })
    }
  }

  processRecordTypeData(result, self) {
    let recordTypeInfo = JSON.parse(result);
    self.myTableData.forEach(profile => {
      let matchedRecordType = [];
      let isPermission = profile.type == 'Profile' ? false : true;

      let matchedRecordTypeInfo = recordTypeInfo[profile.profileAPIName];
      if (!isPermission) {
        matchedRecordType.push({ parentId: profile.profilePermissionAPIName, labelName: 'Master', permissionApiName: profile.profileAPIName, isReadOnly: isPermission, name: this.allObjects.objectName + '.Master', isModified: false, available: false, isDefault: false, type: profile.type });
      }

      if (matchedRecordTypeInfo) {
        self.recordTypesofObject.forEach(recordType => {
          let matchedRecordTypetemp = matchedRecordTypeInfo.filter(ele => recordType.developerName == ele.name);
          if (matchedRecordTypetemp.length > 0) {
            matchedRecordTypetemp[0].labelName = recordType.name;
            matchedRecordType = [...matchedRecordType, ...matchedRecordTypetemp]
          } else {
            matchedRecordTypetemp = [];

            matchedRecordTypetemp.push({ parentId: profile.profilePermissionAPIName, permissionApiName: profile.profileAPIName, labelName: recordType.name, isReadOnly: isPermission, name: recordType.developerName, isModified: false, available: false, isDefault: false, type: profile.type });
            matchedRecordType = [...matchedRecordType, ...matchedRecordTypetemp]
          }
        })
      }
      else if (profile.recordTypeAccess == undefined || profile.recordTypeAccess == null) {
        self.recordTypesofObject.forEach(recordType => {
          matchedRecordType.push({ parentId: profile.profilePermissionAPIName, labelName: recordType.name, permissionApiName: profile.profileAPIName, isReadOnly: isPermission, name: recordType.developerName, isModified: false, available: false, isDefault: false, type: profile.type })
        })
      }

      let values = matchedRecordType.filter(element => element.isDefault == true);
      if (values.length == 0) {
        matchedRecordType.forEach(element => {
          if (element.labelName == 'Master') {
            element.available = true;
            element.isDefault = true;
          }
        })
      }
      if (matchedRecordType.length) {
        profile.recordTypeAccess = matchedRecordType;
      }

    })
    self.tableData = JSON.parse(JSON.stringify(self.myTableData));
    self.tableDataSource = JSON.parse(JSON.stringify(self.myTableData));

  }

  getSelectedObjectPermissionData() {
    let getObjectsPermissions = {
      accessToken: this.accessToken,
      baseUrl: this.baseUrl,
      method: 'GET',
    }
    return getObjectsPermissions({ jsonDataStr: JSON.stringify(getObjectsPermissions), selectedObjectNames: this.allObjects.objectName, selectedParentIds: this.allObjects.selectedIdList })
      .then((result) => {
        var objectAccessData = JSON.parse(result).records;
        for (let i = 0; i < objectAccessData.length; i++) {
          if (objectAccessData[i].Id != undefined && objectAccessData[i].Id != null && !(this.objectPermissionList.includes(objectAccessData[i].Id))) {
            this.objectPermissionList.push({
              objectPermissionId: objectAccessData[i].Id,
              parentId: objectAccessData[i].ParentId,
              readAccess: objectAccessData[i].PermissionsRead,
              createAccess: objectAccessData[i].PermissionsCreate,
              editAccess: objectAccessData[i].PermissionsEdit,
              deleteAccess: objectAccessData[i].PermissionsDelete,
              viewAllAccess: objectAccessData[i].PermissionsViewAllRecords,
              modifyAllAccess: objectAccessData[i].PermissionsModifyAllRecords,
              objectName: objectAccessData[i].SobjectType,
              type: (objectAccessData[i].Parent.Profile == undefined && objectAccessData[i].Parent.Profile == null) ? 'PermissionSet' : 'Profile',
              profilePermissionName: (objectAccessData[i].Parent.Profile == undefined && objectAccessData[i].Parent.Profile == null) ? objectAccessData[i].Parent.Label : objectAccessData[i].Parent.Profile.Name,
              recordType: []
            })
          }
        }

      }).catch((err) => {
        this.autoCloseTime = 4000;
        this.isSpinner = false;
      });
  }

  recordTypeSelect(event) {
    let selectedvalues = event.detail.payload;
    let multiselect = event.detail.payloadType;
    if (multiselect == 'multi-select') {
      this.allObjects['selectedIdList'] = selectedvalues.values;
    } else {

    }
  }

  buttonSelectObject(event) {
    let selectedvalues = event.detail.payload;

    if (selectedvalues != null && selectedvalues != undefined && this.allObjects['objectName'] != selectedvalues.value) {
      this.allObjects['objectName'] = selectedvalues.value;
      //Fetch object record types.
      this.gettingRecordTypesOfObject();
    }

  }

  gettingRecordTypesOfObject() {
    getRecordTypePermissions({ accessToken: this.accessToken, baseUrl: this.baseUrl, selectedObjectNames: this.allObjects.objectName })
      .then((result) => {
        let recordTypes = JSON.parse(result).records;
        let recordTypesofObj = [];
        recordTypes.forEach((element) => {
          recordTypesofObj.push({
            id: element.Id,
            developerName: this.allObjects.objectName + '.' + element.DeveloperName,
            name: element.Name
          })
        })
        this.recordTypesofObject = recordTypesofObj;

      }).catch((err) => {
        this.autoCloseTime = 4000;
        this.showToast('error', JSON.stringify(err));
        this.isSpinner = false;
      });
  }

  async fetchRecordTypePermissions() {
    this.revertValues();
    if (this.allObjects.objectName == undefined && this.allObjects.objectName == null) {
      this.isSpinner = false;
      this.showToast('error', this.labels.SelectObjectWarning);
    } else if ((this.allObjects.selectedIdList == undefined && this.allObjects.selectedIdList == null) || this.allObjects.selectedIdList.length == 0) {
      this.isSpinner = false;
      this.showToast('error', this.labels.SelectProfileandPermissionSetwarning);
    } else {
      this.isdataFetched = false;
      let tempAllObject = JSON.parse(JSON.stringify(this.allObjects));

      let chunkedObjectInformationContainer = new Array(Math.ceil(tempAllObject.selectedIdList.length / this.labels.MassObjectFetchChunk)).fill().map(_ => { return { objectName: tempAllObject.objectName, selectedIdList: tempAllObject.selectedIdList.splice(0, this.labels.MassObjectFetchChunk) } });
      this.recursivePromiseChainHandler(chunkedObjectInformationContainer, this);
    }
  }

  revertValues() {
    this.isSpinner = true;
    this.readAll = false;
    this.createAll = false;
    this.editAll = false;
    this.deleteAll = false;
    this.viewAll = false;
    this.modifyAll = false;
    this.isObjectTypeRecurrsion = true;
    this.objectPermissionList = [];
    this.myTableData = [];
    this.tableData = [];
    this.errorMessage = null;
    this.errorType = null;
    this.isObjectTypeSaveDone = false;
    this.isRecordTypeSaveDone = false;
  }

  selectDiselectObjectPermissions(event) {
    let objectAccessType = event.target.dataset.objectaccesstype;
    let isCRUDAccess = event.target.checked;
    let parentId = event.target.dataset.parentid;
    let recordTypeName = event.target.dataset.recordtypename;
    let type = event.target.dataset.type;

    if (parentId != undefined && parentId != '') {
      this.tableData.forEach(element => {
        let recordType = element?.recordTypeAccess ? element?.recordTypeAccess.length : undefined;
        if (recordType) {
          let flag = 0;
          if (element.profilePermissionAPIName == parentId) {
            for (let i = 0; i < element.recordTypeAccess.length; i++) {
              if (element.recordTypeAccess[i].parentId === parentId) {
                element.isRecordTypeModified = true;
                if (element.recordTypeAccess[i].name == recordTypeName && recordTypeName == this.allObjects.objectName + '.Master') {
                  element.recordTypeAccess[i].isModified = true;
                  element.recordTypeAccess[i].available = isCRUDAccess;
                  element.recordTypeAccess[i].isDefault = isCRUDAccess;
                  flag = 1;
                  break;

                }

                if (element.recordTypeAccess[i].name == recordTypeName) {
                  element.recordTypeAccess[i].isModified = true;
                  let recordTypeList = element.recordTypeAccess.filter(element => element.name == this.allObjects.objectName + '.Master');
                  recordTypeList.forEach(element => {
                    element.isModified = true;
                    if (isCRUDAccess) {
                      element.isDefault = false;
                      element.available = false;
                    }
                  })
                  if (objectAccessType == 'available') {
                    element.recordTypeAccess[i].available = isCRUDAccess;
                    if (type == 'Profile') {
                      let defaultTemp = element.recordTypeAccess.filter(e => e.isDefault == true);
                      element.recordTypeAccess[i].isDefault = defaultTemp.length ? element.recordTypeAccess[i].isDefault : true;
                    }
                    if (!isCRUDAccess) {
                      if (type == 'Profile') {
                        element.recordTypeAccess[i].isDefault = false;
                        let isDefault = element.recordTypeAccess.find(element => element.isDefault == true);
                        let count = 0;
                        if (isDefault == undefined || isDefault == null) {
                          element.recordTypeAccess.forEach(element => {
                            if (element.available == true && element.isDefault == false && element.parentId == parentId) {
                              count = count + 1;
                              if (count == 1) {
                                element.isDefault = true;
                              }
                            }
                          })
                        }
                      }

                    }

                  } else if (objectAccessType == 'isDefault') {
                    element.recordTypeAccess[i].isDefault = isCRUDAccess;
                    if (isCRUDAccess) {
                      element.recordTypeAccess[i].available = isCRUDAccess;
                      for (let j = 0; j < element.recordTypeAccess.length; j++) {
                        if (element.recordTypeAccess[j].name != element.recordTypeAccess[i].name) {
                          element.recordTypeAccess[j].isDefault = false;
                          element.recordTypeAccess[j].isModified = true;
                        }
                      }
                    } else {
                      let val = element.recordTypeAccess[i].name;
                      let check = false;
                      element.recordTypeAccess.forEach(element => {
                        if (element.available == true && element.parentId == parentId && val != element.name) {
                          if (!check) {
                            element.isDefault = true;
                          }
                          check = true;

                        } else {
                          element.available = false;
                        }
                      })
                    }

                  }
                }
              }
            }

            if (flag == 1) {
              //getting other record types other than master
              let recordTypeList = element.recordTypeAccess.filter(element => element.name != recordTypeName && recordTypeName == this.allObjects.objectName + '.Master');
              recordTypeList.forEach(element => {
                element.isModified = true;
                if (isCRUDAccess) {
                  element.isDefault = false;
                  element.available = false;
                }
              })
            }
            if (element.type == 'Profile') {
              let noDefault = element.recordTypeAccess.filter(element => element.isDefault == true);
              if (noDefault.length == 0) {
                this.showToast('error', ' No default record type has been selected. Please select a default record type.');
              }
            }
          }
        }
        for (let i = 0; i < element.objectPermission.length; i++) {
          if (element.objectPermission[i].parentId == parentId) {
            element.isObjectModified = true;
            if (objectAccessType == 'readAccess') {
              element.objectPermission[i].readAccess = isCRUDAccess;
              if (!isCRUDAccess) {
                element.objectPermission[i].modifyAllAccess = isCRUDAccess;
                element.objectPermission[i].viewAllAccess = isCRUDAccess;
                element.objectPermission[i].deleteAccess = isCRUDAccess;
                element.objectPermission[i].editAccess = isCRUDAccess;
                element.objectPermission[i].createAccess = isCRUDAccess;
              }
            } else if (objectAccessType == 'createAccess') {
              element.objectPermission[i].createAccess = isCRUDAccess;
              if (isCRUDAccess) {
                element.objectPermission[i].readAccess = isCRUDAccess;
              }
            } else if (objectAccessType == 'editAccess') {
              element.objectPermission[i].editAccess = isCRUDAccess;
              if (isCRUDAccess) {
                element.objectPermission[i].readAccess = isCRUDAccess;
              } else {
                element.objectPermission[i].deleteAccess = isCRUDAccess;
                element.objectPermission[i].modifyAllAccess = isCRUDAccess;
              }
            } else if (objectAccessType == 'deleteAccess') {
              element.objectPermission[i].deleteAccess = isCRUDAccess;
              if (isCRUDAccess) {
                element.objectPermission[i].readAccess = isCRUDAccess;
                element.objectPermission[i].editAccess = isCRUDAccess;
              } else {
                element.objectPermission[i].modifyAllAccess = isCRUDAccess;
              }
            } else if (objectAccessType == 'viewAllAccess') {
              element.objectPermission[i].viewAllAccess = isCRUDAccess;
              if (isCRUDAccess) {
                element.objectPermission[i].readAccess = isCRUDAccess;
              } else {
                element.objectPermission[i].modifyAllAccess = isCRUDAccess;
              }
            } else if (objectAccessType == 'modifyAllAccess') {
              element.objectPermission[i].modifyAllAccess = isCRUDAccess;
              if (isCRUDAccess) {
                element.objectPermission[i].viewAllAccess = isCRUDAccess;
                element.objectPermission[i].deleteAccess = isCRUDAccess;
                element.objectPermission[i].editAccess = isCRUDAccess;
                element.objectPermission[i].readAccess = isCRUDAccess;
              }
            }
            let isUpdated = element.objectPermission[i].isModified;
            element.objectPermission[i].isModified = isUpdated ? false : true;
            let isRecTypeUpdated = element.recordTypeAccess[i].isModified;
            element.recordTypeAccess[i].isModified = isRecTypeUpdated ? false : true;
          }
        }
      });

    }
  }

  modifiedRecordTypeFilter() {

    let updatedRecTypePermissionList = this.tableData.filter(element => element.isRecordTypeModified == true)
    updatedRecTypePermissionList.forEach(modifiedList => {
      for (let i = 0; i < modifiedList.recordTypeAccess.length; i++) {
        this.newRecordTypeAccessList.push(modifiedList.recordTypeAccess[i]);
      }
    })
  }
  saveRecordTypePermissions() {
    this.isSpinner = true;
    var compositeRequestList = [];
    this.modifiedRecordTypeFilter();
    let updatedObjectPermissionList = this.tableData.filter(element => element.isObjectModified == true)
    updatedObjectPermissionList.forEach(modifiedList => {
      //UPDATE
      for (let i = 0; i < modifiedList.objectPermission.length; i++) {
        if (modifiedList.objectPermission[i].objectPermissionId) {
          var compositeRequest = {
            "method": "PATCH",
            "referenceId": "UpdateObjectPermissions" + modifiedList.objectPermission[i].objectPermissionId + i,

            "url": "/services/data/v56.0/sobjects/ObjectPermissions/" + modifiedList.objectPermission[i].objectPermissionId,
            "body": {
              "SobjectType": this.allObjects.objectName,
              "PermissionsRead": modifiedList.objectPermission[i].readAccess,
              "PermissionsCreate": modifiedList.objectPermission[i].createAccess,
              "PermissionsEdit": modifiedList.objectPermission[i].editAccess,
              "PermissionsDelete": modifiedList.objectPermission[i].deleteAccess,
              "PermissionsViewAllRecords": modifiedList.objectPermission[i].viewAllAccess,
              "PermissionsModifyAllRecords": modifiedList.objectPermission[i].modifyAllAccess,
            }
          }
          compositeRequestList.push(compositeRequest);
        }
        else {
          //INSERT
          var compositeRequest = {
            "method": "POST",
            "referenceId": "NewObjectPermissions" + modifiedList.objectPermission[i].parentId + i,
            "url": "/services/data/v56.0/sobjects/ObjectPermissions",
            "body": {
              "SobjectType": this.allObjects.objectName,
              "ParentId": modifiedList.objectPermission[i].parentId,
              "PermissionsRead": modifiedList.objectPermission[i].readAccess,
              "PermissionsCreate": modifiedList.objectPermission[i].createAccess,
              "PermissionsEdit": modifiedList.objectPermission[i].editAccess,
              "PermissionsDelete": modifiedList.objectPermission[i].deleteAccess,
              "PermissionsViewAllRecords": modifiedList.objectPermission[i].viewAllAccess,
              "PermissionsModifyAllRecords": modifiedList.objectPermission[i].modifyAllAccess,
            }
          }
          compositeRequestList.push(compositeRequest);
        }
      }
    })

    this.updatedObjectPermissionJsonString = {
      allOrNone: false,
      compositeRequest: compositeRequestList
    }

    this.objectSize = this.updatedObjectPermissionJsonString.compositeRequest.length;
    this.recordTypeSize = this.newRecordTypeAccessList.length;
    if (this.updatedObjectPermissionJsonString.compositeRequest.length == 0 && this.newRecordTypeAccessList.length == 0) {
      this.showToast('error', this.labels.NoChanges);
      this.isSpinner = false;
    } else {
      this.isBothPermissions = false;
      this.saveRecordTypeRecursionHandler(new Array(Math.ceil(this.newRecordTypeAccessList.length / this.labels.MassObjectSaveChunk)).fill().map(_ => this.newRecordTypeAccessList.splice(0, this.labels.MassObjectSaveChunk)), this);
      this.saveObjectPermissionRecursionHandler(new Array(Math.ceil(this.updatedObjectPermissionJsonString.compositeRequest.length / this.labels.MassObjectSaveChunk)).fill().map(_ => { return { allOrNone: false, compositeRequest: this.updatedObjectPermissionJsonString.compositeRequest.splice(0, this.labels.MassObjectSaveChunk) } }), this)
    }
  }

  selectOrDeselectAllPermissions(event) {
    let label = event.target.label;
    this.isSelectAll = event.target.checked;
    let objectAccessType = event.target.dataset.objectaccesstype;
    
    if (event.target.dataset.scope == 'REVERT') {
      this.tableData = JSON.parse(JSON.stringify(this.tableDataSource));
      this.readAll = false;
      this.createAll = false;
      this.editAll = false;
      this.deleteAll = false;
      this.viewAll = false;
      this.modifyAll = false;
    }

    this.tableData.forEach(element => {
      for (let i = 0; i < element.objectPermission.length; i++) {
        element.isObjectModified = true;
        if (objectAccessType == 'readAccess') {
          element.objectPermission[i].readAccess = this.isSelectAll;
          this.readAll = this.isSelectAll;
          if (!this.isSelectAll) {
            element.objectPermission[i].modifyAllAccess = this.isSelectAll;
            element.objectPermission[i].viewAllAccess = this.isSelectAll;
            element.objectPermission[i].deleteAccess = this.isSelectAll;
            element.objectPermission[i].editAccess = this.isSelectAll;
            element.objectPermission[i].createAccess = this.isSelectAll;
            this.createAll = this.isSelectAll;
            this.editAll = this.isSelectAll;
            this.deleteAll = this.isSelectAll;
            this.viewAll = this.isSelectAll;
            this.modifyAll = this.isSelectAll;

          }
        } else if (objectAccessType == 'createAccess') {
          element.objectPermission[i].createAccess = this.isSelectAll;
          this.createAll = this.isSelectAll;
          if (this.isSelectAll) {
            element.objectPermission[i].readAccess = this.isSelectAll;
            this.readAll = this.isSelectAll;
          }
        } else if (objectAccessType == 'editAccess') {
          element.objectPermission[i].editAccess = this.isSelectAll;
          this.editAll = this.isSelectAll;
          if (this.isSelectAll) {
            element.objectPermission[i].readAccess = this.isSelectAll;
            this.readAll = this.isSelectAll;
          } else {
            element.objectPermission[i].deleteAccess = this.isSelectAll;
            element.objectPermission[i].modifyAllAccess = this.isSelectAll;
            this.deleteAll = this.isSelectAll;
            this.modifyAll = this.isSelectAll;
          }
        } else if (objectAccessType == 'deleteAccess') {
          element.objectPermission[i].deleteAccess = this.isSelectAll;
          this.deleteAll = this.isSelectAll;
          if (this.isSelectAll) {
            element.objectPermission[i].readAccess = this.isSelectAll;
            element.objectPermission[i].editAccess = this.isSelectAll;
            this.readAll = this.isSelectAll;
            this.editAll = this.isSelectAll;

          } else {
            element.objectPermission[i].modifyAllAccess = this.isSelectAll;
            this.modifyAll = this.isSelectAll;
          }
        } else if (objectAccessType == 'viewAllAccess') {
          element.objectPermission[i].viewAllAccess = this.isSelectAll;
          this.viewAll = this.isSelectAll;
          if (this.isSelectAll) {
            element.objectPermission[i].readAccess = this.isSelectAll;
            this.readAll = this.isSelectAll;
          } else {
            element.objectPermission[i].modifyAllAccess = this.isSelectAll;
            this.modifyAll = this.isSelectAll;
          }
        } else if (objectAccessType == 'modifyAllAccess') {
          element.objectPermission[i].modifyAllAccess = this.isSelectAll;
          this.modifyAll = this.isSelectAll;
          if (this.isSelectAll) {
            element.objectPermission[i].viewAllAccess = this.isSelectAll;
            element.objectPermission[i].deleteAccess = this.isSelectAll;
            element.objectPermission[i].editAccess = this.isSelectAll;
            element.objectPermission[i].readAccess = this.isSelectAll;
            this.readAll = this.isSelectAll;
            this.editAll = this.isSelectAll;
            this.deleteAll = this.isSelectAll;
            this.viewAll = this.isSelectAll;
          }
        }
        let isUpdated = element.objectPermission[i].isModified;
        element.objectPermission[i].isModified = isUpdated ? false : true;
      }
    })

  }
  showToast(type, message) {
    this.template.querySelector('c-custom-toast').showToast(type, message);
  }

}