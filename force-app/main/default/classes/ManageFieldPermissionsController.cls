/**
 * @description       : Controller class for ManageFieldPermissions related LWC components
 * @author            : CEPTES
**/
public class ManageFieldPermissionsController{
    private static final String MYORG_URL = URL.getSalesforceBaseUrl().toExternalForm();
    
    @AuraEnabled(cacheable=true)
    public static  ManagePermissions__mdt  managePermissionsMdt(){
        ManagePermissions__mdt managePermissionsMdtRecs = new ManagePermissions__mdt();
        //FALSE POSITIVE
        //CRUD,FLS check is not required for custom metadata records
        managePermissionsMdtRecs = [SELECT Label,Hide_Objects__c,Hide_Fields__c,Hide_Permissions__c, apiversion__c
                                    FROM ManagePermissions__mdt];

            return managePermissionsMdtRecs;
    }

    /**
    * @description  : Method for reruning all fieldPermissions of selected object, Profiles and permissions
    * @author CEPTES 
    * @param accessToken 
    * @param baseUrl 
    * @param jsonDataStr 
    * @return String 
    **/
    @AuraEnabled
    public static String getFieldPermissions(String accessToken, String baseUrl,String jsonDataStr){
        FieldPermissionsWrapper wrapper = (FieldPermissionsWrapper)JSON.deserialize(jsonDataStr, 
                                                  FieldPermissionsWrapper.class);                                       
        String queryStr = String.format('{0}{1}{2}{3}{4}', new List<String>{ 
                          'SELECT+Id,SobjectType,Field,PermissionsEdit,PermissionsRead,Parent.Profile.name,ParentId,Parent.Type,Parent.Name,Parent.Label+',  
                          'FROM+FieldPermissions+WHERE+SobjectType', 
                          '=\'', 
                          wrapper.objectName, 
                          '\''
        });

        if(wrapper.selectedIdList != null && !wrapper.selectedIdList.isEmpty() ){
            queryStr = String.format('{0}{1}{2}{3}', new List<String>{ 
                          queryStr, '+AND+(',  ManagePermissionsUtility.getStringFormated(wrapper.selectedIdList, 'ParentId') , ')'
            });
        }
        ManagePermissionsUtility.RestInputWrapper wrap = new ManagePermissionsUtility.RestInputWrapper();
        wrap.accessToken = accessToken;
        wrap.baseUrl = baseUrl;
        wrap.queryString = 'query/?q=' + queryStr;
        wrap.method = 'GET';
        String responseBody = ManagePermissionsUtility.getRestResponse(JSON.serialize(wrap));
        return responseBody;

    }

    
    /**
    * @description  : Method for saving updated field permissions
    * @author       : CEPTES
    * @param        : accessToken 
    * @param        : baseUrl 
    * @param        : jsonInputString 
    * @return       : String 
    **/

    @AuraEnabled
      public static String updateFieldPermissions(String accessToken, String baseUrl, String jsonInputString){
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint(baseUrl + '/services/data/v56.0/composite');
        request.setHeader('Authorization','Bearer '+ accessToken);
        request.setHeader('Content-Type','application/json');            
        request.setMethod('POST');
        request.setBody(jsonInputString);
        HttpResponse response = http.send(request); 
        return response.getBody();   
    }


    /**
    * @description  : Method to get all fields data of an object
    * @author       : CEPTES 
    * @param        : accessToken 
    * @param        : baseUrl 
    * @param        : objectName 
    * @return       : List<MassFieldPermissionWrapper> 
    **/
    @AuraEnabled
    public static List<MassFieldPermissionWrapper> getAllFieldsFromObj(String accessToken, String baseUrl, String objectName){

        List<MassFieldPermissionWrapper> fieldWrapperList = new List<MassFieldPermissionWrapper>();

     MetadataService.MetadataPort service = new MetadataService.MetadataPort();
   //  MetadataService.MetadataPort service = createService();
        service.endpoint_x = baseUrl+'/services/Soap/m/42.0';
        service.CallOptions = new MetadataService.CallOptions_element();
        service.timeout_x = 120000;
    service.SessionHeader = new MetadataService.SessionHeader_element();
  //  service.SessionHeader.sessionId = UserInfo.getSessionId();
    service.SessionHeader.sessionId =accessToken;

    List <String> objectNames = new List <String>();
    objectNames.add(objectName);
    List <String> fieldName = new List <String>();
    try {
        MetadataService.IReadResult readResult = service.readMetadata('CustomObject', objectNames);
        MetadataService.Metadata[] mdInfo = readResult.getRecords();
        for (MetadataService.Metadata md : mdInfo) {
            if (md != null) {
                MetadataService.CustomObject obj = (MetadataService.CustomObject) md;
                if(obj.fields != null) {
                    for(MetadataService.CustomField field : obj.fields) {
                        if(field != null) {
                        MassFieldPermissionWrapper fieldWrapper = new MassFieldPermissionWrapper();
                        
                            fieldWrapper.apiName=field.fullName;
                            fieldWrapper.label= field.label;
                            fieldWrapper.dataType = field.formula !=null ? 'Formula' : field.type_x;

                          //  fieldName.add(field.fullName);
                            fieldWrapperList.add(fieldWrapper);
        
                        }
                    }
                }
            } 
        }
        
    }   
     catch (Exception ce) {
    }

    return fieldWrapperList;
    }

     public class MassFieldPermissionWrapper{
        @AuraEnabled
        public string label{get;set;}
        @AuraEnabled
        public string apiName{get;set;}
        @AuraEnabled
        public string dataType{get;set;}
    }
    @Testvisible   
    private class FieldPermissionsWrapper{
          
      private String objectName;
       
      private List<String> selectedIdList; 
    }

    @Testvisible
    private class GetsObjects{
        @AuraEnabled
       public string label {get; set;}
        @AuraEnabled
       public string value {get; set;}
   }   
   

}