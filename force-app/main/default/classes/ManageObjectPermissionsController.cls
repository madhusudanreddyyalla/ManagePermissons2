/**
 * @description       : Comtroller class for lwc component lwc_ManageObjectPermissions
 * @author            : CEPTES
 * @last modified on  : 12-06-2022
 * @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
 **/
public with sharing class ManageObjectPermissionsController{
    public static string accessTokenVar;
    public static string baseUrlVar;
    public static List<MetadataService.Profile> profilesWithPermissionInfoFromTest;
    public static List<MetadataService.PermissionSet> permissionSetsFromTest;
    public static List<MetadataService.SaveResult> lstResultsForPermissionSetTest;
    public static List<MetadataService.SaveResult> lstResultsForProfileTest;
    /**
     * @description      : For Getting All Object Access Permissions
     * @author           : CEPTES
     * @param            : accessToken, baseUrl, selectedObjectNames, selectedParentIds
     * @return           : string
     **/
    @AuraEnabled
    public static string getObjectsPermissions(String jsonDataStr, List<String> selectedObjectNames, List<String> selectedParentIds){
        String sobjectType = ManagePermissionsUtility.getStringFormated(selectedObjectNames, 'SobjectType');
        String parentIds = ManagePermissionsUtility.getStringFormated(selectedParentIds, 'ParentId');
        
        ManagePermissionsUtility.RestInputWrapper wrap = (ManagePermissionsUtility.RestInputWrapper)JSON.deserialize(jsonDataStr, ManagePermissionsUtility.RestInputWrapper.class);

        wrap.queryString = 'query/?q=Select+id,ParentId,Parent.Label,Parent.Profile.Name,PermissionsRead,PermissionsEdit,PermissionsCreate,PermissionsDelete,PermissionsViewAllRecords,PermissionsModifyAllRecords,SobjectType+from+ObjectPermissions+where+' + '(' + sobjectType + ')' + '+AND+' + '(' + parentIds + ')';
        String responseBody = ManagePermissionsUtility.getRestResponse(JSON.serialize(wrap));
        return responseBody;
    }

    /**
     * @description      : For getting All Record Types for anobject
     * @author           : CEPTES
     * @param            : accessToken, baseUrl, selectedObjectNames
     * @return           : string
     **/
    @AuraEnabled
    public static string getRecordTypePermissions(String accessToken, String baseUrl, List<String> selectedObjectNames){
        String sobjectType = ManagePermissionsUtility.getStringFormated(selectedObjectNames, 'SobjectType');
        ManagePermissionsUtility.RestInputWrapper wrap = new ManagePermissionsUtility.RestInputWrapper();
        wrap.accessToken = accessToken;
        wrap.baseUrl = baseUrl;
        wrap.queryString = 'query/?q=Select+Id,Name,DeveloperName,SobjectType+from+RecordType+where+IsActive+=+true+AND+' + '(' + sobjectType + ')';
        wrap.method = 'GET';
        String responseBody = ManagePermissionsUtility.getRestResponse(JSON.serialize(wrap));
        return responseBody;
    }

    /**
     * @description      : For fetching record type permissions
     * @author           : CEPTES | 12-02-2022
     * @param            : accessToken, baseUrl, jsonProfilesAndPSData
     * @return           : String
     **/
    @AuraEnabled
    public static String readRecordtypeAccess(String accessToken, String baseUrl, String jsonProfilesAndPSData){

        MetadataService.MetadataPort service = createService(accessToken);
        service.endpoint_x = baseUrl + '/services/Soap/m/42.0';
        service.CallOptions = new MetadataService.CallOptions_element();
        service.timeout_x = 120000;

        List<String> permissionSetIdList = new List<String>();
        List<String> profileIdList = new List<String>();

        Map<String, List<RecordTypeDataWrapper>> permissionAndRecordTypeDataMap = new Map<String, List<RecordTypeDataWrapper>>();

        ProfileAndPSPermissionsWrapper[] profileandPSWrapperList = (ProfileAndPSPermissionsWrapper[])JSON.deserialize(jsonProfilesAndPSData, ProfileAndPSPermissionsWrapper[].class);
        for (ProfileAndPSPermissionsWrapper profileandPSWrapper : profileandPSWrapperList){
            if (profileandPSWrapper?.type?.equalsIgnoreCase('PermissionSet')){
                permissionSetIdList.add(profileandPSWrapper.permissionApiName);
            } else{
                profileIdList.add(profileandPSWrapper.permissionApiName);
            }
        }
        if (!permissionSetIdList.isEmpty()){
            List<MetadataService.PermissionSet> permissionSets = new List<MetadataService.PermissionSet>();
            if (Test.isRunningTest()){
                permissionSets = permissionSetsFromTest;
            } else{
                    for(string permissionSetId:permissionSetIdList){
                    List<MetadataService.PermissionSet> currentPermissionSet = new List<MetadataService.PermissionSet>();
                    currentPermissionSet =(List<MetadataService.PermissionSet>)service.readMetadata('PermissionSet', new List<String>{permissionSetId}).getRecords();
                     String permissionSetName = currentPermissionSet[0].label;
                List<RecordTypeDataWrapper> recordTypeDataList = new List<RecordTypeDataWrapper>();
                if (currentPermissionSet[0].recordTypeVisibilities != null && !currentPermissionSet[0].recordTypeVisibilities.isEmpty()){
                    for (MetadataService.PermissionSetRecordTypeVisibility rtv : currentPermissionSet[0].recordTypeVisibilities){
                        RecordTypeDataWrapper rec = new RecordTypeDataWrapper();
                        rec.name = rtv.recordType;
                        rec.available = rtv.visible;
                        rec.isDefault = null;
                        rec.parentId = currentPermissionSet[0].fullName;
                        rec.type = 'PermissionSet';
                        rec.isModified = false;
                        rec.isReadOnly = true;
                        recordTypeDataList.add(rec);
                    }
                }
                if(permissionSetName != null){
                    permissionAndRecordTypeDataMap.put(permissionSetName, recordTypeDataList);
                }
                 }
            }
        }

        if (!profileIdList.isEmpty()){
            
            List<MetadataService.Profile> profilesWithPermissionInfo = new List<MetadataService.Profile>();
            if (Test.isRunningTest()){
                profilesWithPermissionInfo = profilesWithPermissionInfoFromTest;
            } else{
                    for(string profileId : profileIdList){
                    List<MetadataService.Profile> profileMeta = new List<MetadataService.Profile>();
                    profileMeta = (List<MetadataService.Profile>)service.readMetadata('Profile', new List<String>{profileId}).getRecords();
                 //   profilesWithPermissionInfo.addAll(profilesWithPermission);
                 List<RecordTypeDataWrapper> recordTypeDataList = new List<RecordTypeDataWrapper>();
                if (profileMeta[0]?.recordTypeVisibilities != null && !profileMeta[0]?.recordTypeVisibilities.isEmpty()){
                    for (MetadataService.ProfileRecordTypeVisibility profileRecordTypeVisiblityInfo : profileMeta[0]?.recordTypeVisibilities){
                        RecordTypeDataWrapper rec = new RecordTypeDataWrapper();
                        rec.name = profileRecordTypeVisiblityInfo.recordType;
                        rec.available = profileRecordTypeVisiblityInfo.visible;
                        rec.isDefault = profileRecordTypeVisiblityInfo.default_x;
                        rec.parentId = profileMeta[0].fullName;
                        rec.type = 'Profile';
                        rec.isModified = false;
                        rec.isReadOnly = false;
                        recordTypeDataList.add(rec);
                    }
                }
                if (!recordTypeDataList.isEmpty() && profileMeta[0].fullName != null){
                    permissionAndRecordTypeDataMap.put(profileMeta[0].fullName, recordTypeDataList);
                }
            
                    }
            
            }
        }
        return JSON.serialize(permissionAndRecordTypeDataMap);
    }
    

    /**
     * @description      : To update record type permissions for profiles and permission sets
     * @author           : CEPTES
     * @param            : accessToken, baseUrl
     * @param jsonInputString
     **/
    @AuraEnabled
    public static void updateRecordTypePermissions(String accessToken, String baseUrl, String jsonInputString){
        accessTokenVar = accessToken;
        baseUrlVar = baseUrl;
        Set<String> profileNameList = new Set<String>();
        Set<String> permissionSetNameList = new Set<String>();
        List<RecordTypeDataWrapper> recTypeModifiedDataWrapList = (List<RecordTypeDataWrapper>)JSON.deserialize(jsonInputString, List<RecordTypeDataWrapper>.class);
        Map<String, List<RecordTypeDataWrapper>> pIdRecordTypeWrapperMap = new Map<String, List<RecordTypeDataWrapper>>();

        for (RecordTypeDataWrapper rcWrap : recTypeModifiedDataWrapList){
            if (pIdRecordTypeWrapperMap.containsKey(rcWrap.parentId)){
                pIdRecordTypeWrapperMap.get(rcWrap.parentId).add(rcWrap);
            } else{
                List<RecordTypeDataWrapper> recTypeWrapList = new List<RecordTypeDataWrapper>();
                recTypeWrapList.add(rcWrap);
                pIdRecordTypeWrapperMap.put(rcWrap.parentId, recTypeWrapList);
            }
            if (rcWrap?.type.equalsIgnoreCase('Profile')){
                profileNameList.add(rcWrap.parentId);
            } else if (rcWrap?.type.equalsIgnoreCase('PermissionSet')){
                permissionSetNameList.add(rcWrap.parentId);
            }
        }
        if (!profileNameList.isEmpty()){
            updateProfileRecordType(profileNameList, pIdRecordTypeWrapperMap);
        }
        if (!permissionSetNameList.isEmpty()){
            updatePermissionSetRecordType(permissionSetNameList, pIdRecordTypeWrapperMap);
        }
    }

    /**
     * @description      : To update record type permissions for profiles
     * @author           : CEPTES
     * @param            : accessToken, baseUrl, profileNameList, pIdRecordTypeWrapperMap
     * @return           : String
     **/
    private static String updateProfileRecordType(Set<String> profileNameList, Map<String, List<RecordTypeDataWrapper>> pIdRecordTypeWrapperMap){
        for(string profileName : profileNameList){
        MetadataService.MetadataPort service = createService(accessTokenVar);
        service.endpoint_x = baseUrlVar + '/services/Soap/m/42.0';
        service.CallOptions = new MetadataService.CallOptions_element();
        service.timeout_x = 120000;
        List<MetadataService.Profile> profilesTOUpdatedList = new  List<MetadataService.Profile>();
        List<MetadataService.Profile> profiles;
        if (Test.isRunningTest()){
            profiles = profilesWithPermissionInfoFromTest;
        } else{
            profiles = (List<MetadataService.Profile>)service.readMetadata('Profile', new List<String>{profileName}).getRecords();
        }

        MetadataService.Profile profilenew = new MetadataService.Profile();
        for (MetadataService.Profile profile : profiles) {
            List<MetadataService.ProfileRecordTypeVisibility> rt = new List<MetadataService.ProfileRecordTypeVisibility>();
            List<RecordTypeDataWrapper> pRecordTypeWrapList = pIdRecordTypeWrapperMap.get(profile.fullName);
            for (RecordTypeDataWrapper recType : pRecordTypeWrapList){
                MetadataService.ProfileRecordTypeVisibility recordTypeRec = new MetadataService.ProfileRecordTypeVisibility();
                recordTypeRec.recordType = recType.name;
                recordTypeRec.visible = recType.available;
                recordTypeRec.default_x = recType.isDefault;
                recordTypeRec.personAccountDefault = null;
                rt.add(recordTypeRec);
                profilenew.fullName = profile.fullName;
                profilenew.recordTypeVisibilities = rt;
            }
            profilenew.fullName = profile.fullName;
            profilenew.recordTypeVisibilities = rt;
            profilesTOUpdatedList.add(profilenew);
        }
        List<MetadataService.SaveResult> lstResults;
        if (Test.isRunningTest()){
            lstResults = lstResultsForProfileTest;
        } else{
            lstResults = service.updateMetadata(profilesTOUpdatedList);
       }
    }
        return null;
  }

    /**
     * @description      : To update record type permissions for permission set
     * @author           : CEPTES
     * @param            : accessToken, baseUrl, permissionSetNameList, pIdRecordTypeWrapperMap
     * @return           : String
     **/
    private static String updatePermissionSetRecordType(Set<String> permissionSetNameList, Map<String, List<RecordTypeDataWrapper>> pIdRecordTypeWrapperMap){
        MetadataService.MetadataPort service = createService(accessTokenVar);
        service.endpoint_x = baseUrlVar + '/services/Soap/m/42.0';
        service.CallOptions = new MetadataService.CallOptions_element();
        service.timeout_x = 120000;
        List<MetadataService.PermissionSet> permissionSets;
        if (Test.isRunningTest()){
            permissionSets = permissionSetsFromTest;
        } else{
            permissionSets = (List<MetadataService.PermissionSet>)service.readMetadata('PermissionSet', new List<String>(permissionSetNameList)).getRecords();
        }
        List<MetadataService.PermissionSetRecordTypeVisibility> rt = new List<MetadataService.PermissionSetRecordTypeVisibility>();

        for (MetadataService.PermissionSet permissionSet : permissionSets){
            List<RecordTypeDataWrapper> pRecordTypeWrapList = pIdRecordTypeWrapperMap.get(permissionSet.fullName);
            for (RecordTypeDataWrapper recType : pRecordTypeWrapList){
                MetadataService.PermissionSetRecordTypeVisibility recordTypeRec = new MetadataService.PermissionSetRecordTypeVisibility();
                recordTypeRec.recordType = recType.name;
                recordTypeRec.visible = recType.available;
                rt.add(recordTypeRec);
                permissionSet.recordTypeVisibilities = rt;
            }
        }
        List<MetadataService.SaveResult> lstResults;
        if (Test.isRunningTest()){
            lstResults = lstResultsForPermissionSetTest;
        } else{
            lstResults = service.updateMetadata(permissionSets);
        }

        return null;
    }

    /**
     * @description      : To update object permissions
     * @author           : CEPTES
     * @param            : accessToken, baseUrl, baseOrgType, jsonInputString
     * @return           : String
     **/
    @AuraEnabled
    public static String updateObjectPermissions(String accessToken, String baseUrl, String jsonInputString){
        ManagePermissions__mdt metadata = ManageFieldPermissionsController.managePermissionsMdt();
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint(baseUrl + '/services/data/'+ metadata.apiversion__c +'/composite');
        request.setHeader('Authorization', 'Bearer ' + accessToken);
        request.setHeader('Content-Type', 'application/json');
        request.setMethod('POST');
        request.setBody(jsonInputString);
        HttpResponse response = http.send(request);
        return response.getBody();
    }

    //Wrapper class to hold record type information
    public class RecordTypeDataWrapper{
        @AuraEnabled
        public String name{ get; set; }

        @AuraEnabled
        public String labelName{ get; set; }

        @AuraEnabled
        public Boolean isReadOnly{ get; set; }

        @AuraEnabled
        public Boolean isDefault{ get; set; }

        @AuraEnabled
        public Boolean available{ get; set; }

        @AuraEnabled
        public String parentId{ get; set; }

        @AuraEnabled
        public String type{ get; set; }

        @AuraEnabled
        public Boolean isModified{ get; set; }

    }

    /**
     * @description      : To create an instance of metadataservice
     * @author           : CEPTES
     * @param            : accessToken
     * @return MetadataService.MetadataPort
     **/
    private static MetadataService.MetadataPort createService(String accessToken){
        MetadataService.MetadataPort service = new MetadataService.MetadataPort();
        service.SessionHeader = new MetadataService.SessionHeader_element();
        service.SessionHeader.sessionId = accessToken;
        return service;
    }

    //Wrapper to hold profile and permission set details
    private class ProfileAndPSPermissionsWrapper{
        @AuraEnabled
        public String label;
        @AuraEnabled
        public String permissionApiName;
        @AuraEnabled
        public String type;
        @AuraEnabled
        public String value;

    }

}