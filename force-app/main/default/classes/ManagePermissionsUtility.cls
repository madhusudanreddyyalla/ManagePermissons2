/**
 * @description       : Helper class for Manage Permissions
 * @author            : CEPTES
 * @last modified on  : 12-02-2022
 * @last modified by  : CEPTES
 **/
public with sharing class ManagePermissionsUtility{
    private static final ManagePermissions__mdt MANAGE_PERMISSIONS_MDT_REC = 
        ManagePermissions__mdt.getInstance('ManagePermissions');
    private static String orgType = '';
    private static String orgName = '';

    /**
     * @description      : To convert list to string format
     * @author           : CEPTES | 12-02-2022
     * @param            : selectedValues, type
     * @return           : String
     **/
    public static String getStringFormated(List<String> selectedValues, string type){
        String valueStr = '';
        for (String value : selectedValues){
            valueStr += type + '=\'' + value + '\'' + '+OR+';
        }
        return valueStr.removeEnd('+OR+');
    }

    /**
     * @description      : To make rest call and get response
     * @author           : CEPTES
     * @param            : jsonDataStr
     * @return           : String
     **/
    @AuraEnabled
    public static String getRestResponse(String jsonDataStr){
        RestInputWrapper wrapper = (RestInputWrapper) JSON.deserialize(jsonDataStr, RestInputWrapper.class);
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint(wrapper.baseUrl + '/services/data/' + MANAGE_PERMISSIONS_MDT_REC.apiversion__c  + '/' + wrapper.queryString);
        request.setHeader('Authorization', 'Bearer ' + wrapper.accessToken);
        request.setHeader('Content-Type', 'application/json');
        request.setMethod(wrapper.method);
        if (String.isNotBlank(wrapper.body)){
            request.setBody(wrapper.body);
        }
        HttpResponse response = http.send(request);

        return response.getBody();
    }

    /**
     * @description      : To create remote site settings from platform event records
     * @param            : eventList
     **/
    public static void createRemoteSiteSettings(List<CreateRemoteSiteSetting__e> eventList) {

        for(CreateRemoteSiteSetting__e event : eventList){
            createRemoteSite(event.Record_Id__c , event.orgURL__c, event.User_Id__c);
        }
    }    

    /**
     * @description      : To create remote site settings asynchronously
     * @param            : recordId, orgUrl, userId
     **/
    @future(callout=true)
    public static void createRemoteSite(String recordId, String orgUrl, String userId){     
                    
            //create remote site setting
            String emailBody = '';
            String jsonBody ='{"FullName":"' + 'Apex_'+recordId + '","Metadata":{"disableProtocolSecurity":false,"isActive":true,"url":"' + orgUrl + '","urls":null,"description":"created from apex"}}';
            String endpoint =  URL.getSalesforceBaseUrl().toExternalForm()+'/services/data/'+ MANAGE_PERMISSIONS_MDT_REC.apiversion__c +'/tooling/sobjects/RemoteProxy/';
            string method  = 'POST';
            HttpResponse response = getRestResponse(endpoint, jsonBody, 'POST');
            if(response.getStatusCode() == 201){
    
                //FALSE POSITIVE:
                //CRUD, FLS check not added as this runs asynchronously in automated process context
                DestinationOrg__c destOrg = [SELECT Id, Access_Token__c, Org_Name__c, OrgType__c, Remote_Site_Created__c
                                            FROM DestinationOrg__c WHERE Id =: recordId];
                getNewOrgDetails(destOrg.Access_Token__c , orgUrl);
                destOrg.Org_Name__c = orgName;
                destOrg.OrgType__c = orgType;
                destOrg.Remote_Site_Created__c = true;
                update destOrg;
    
                //publish a new platform event
                
                RemoteSiteCompletion__e platformEvent = new RemoteSiteCompletion__e();
                List<Database.SaveResult> results = EventBus.publish(new List<RemoteSiteCompletion__e>{platformEvent});
            }      
    }   

    /**
    * @description 
    * @author CEPTES | 11-30-2022 
    **/
	@TestVisible
    private static void getNewOrgDetails(String token, String orgUrl){

        Map<String, String> inputMap = new Map<String, String>{
            'accessToken' => token,
                'baseUrl' => orgUrl,
                'queryString' => 'query?q=SELECT+Name,IsSandbox+FROM+Organization',
                'method' => 'GET',
                'body' => ''};
        //String accessToken, String baseUrl, String baseOrgType, String endPointUrl, String method
        String response = ManagePermissionsUtility.getRestResponse(JSON.serialize(inputMap));
        //Parse the JSON String into a Map
        Map<String, Object> jsonParse = (Map<String, Object>)Json.deserializeUntyped(response);
        //Get the records - array of list
        List<Object> listObject = (List<Object>)jsonParse.get('records');
        if(listObject!=null && !listObject.isEmpty()) {
            for (Object o : listObject){
                Map<String, Object> orgDataMap = (Map<String, Object>)o;
                orgName = (String) orgDataMap.get('Name');
                orgType = orgDataMap.get('IsSandbox')?.toString()?.equalsIgnoreCase('true') ? 'Sandbox' : 'Production';
            }
        }
    }

    private static HttpResponse getRestResponse(String endpoint, string body, string method){
        HttpRequest request = new HttpRequest();
        request.setEndpoint(endpoint);
        request.setHeader('Content-Type', 'application/json');
        request.setMethod(method);
        if(String.isNotBlank(body)){
            request.setBody(body);
        }
        Http http = new Http();
        HttpResponse response = http.send(request);
        return response;
    }
    //Wrapper class to hold input details for making rest api call
    public class RestInputWrapper{
        public string accessToken;
        public string baseUrl;
        public string queryString;
        public string method;
        public string body;
    }

    public class SessionId {
        public string sessionId;
    }
    
    @AuraEnabled
    public static string getSessionId() {
         SessionId sessionJson = new SessionId();
        if(!Test.isRunningTest()){
            sessionJson = (SessionId)JSON.deserialize(Page.ManagePermissionsSessionPage.getContent().toString(), SessionId.class);
        }
        system.debug('@@sessionJson-='+ sessionJson);
        return sessionJson.sessionId;
    }

}