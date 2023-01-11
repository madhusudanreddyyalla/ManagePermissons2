/**
 * @description       : Controller class for StoreDestinationOrgCodeVF page
 * @author            : CEPTES
 **/
public with sharing class StoreDestinationOrgCodeVFController{
    //private static final String MYORG_URL = URL.getSalesforceBaseUrl().toExternalForm();
    private static final String MYORG_URL = URL.getOrgDomainUrl().toExternalForm();
    private static final ManagePermissions__mdt MANAGE_PERMISSIONS_MDT_RECS = ManagePermissions__mdt.getInstance('ManagePermissions');
    private static final String LOGIN_URI = 'https://login.salesforce.com';
    private static final String TEST_URI = 'https://test.salesforce.com';
    private static String token;
    private static String companyId;
    private static String orgUrl;
    private static String orgType = '';
    private static String orgName = '';

    /**
     * @description  : Method to validate destination org session
     * @param        : none
     * @return       : PageReference
     **/
    public static PageReference onLoadValidator(){
        PageReference communityUri = new PageReference(MANAGE_PERMISSIONS_MDT_RECS.Community_URL__c);
        String code = System.currentPageReference().getParameters().get('code');
        if (String.isBlank(code)){
            ApexPages.addmessage(new ApexPages.message(ApexPages.severity.WARNING, 'Login Failed! Please Login again.'));
        } else{
            getTokenFromCode(code);
        }
        communityUri.setRedirect(false);
        return communityUri;
    }

    /**
     * @description  : Method to get Token from code
     * @param        : code
     * @return       : none
     **/
    public static void getTokenFromCode(String code){

        HttpResponse response = getToken(LOGIN_URI, code);
        if (response.getStatusCode() != 200){
            response = getToken(TEST_URI, code);
        }

        Map<String, Object> results = (Map<String, Object>)JSON.deserializeUntyped(response.getBody());
        token = (String) results.get('access_token');
        String[] splitToken = token.split('!');
        companyId = splitToken[0];
        orgUrl = (String) results.get('instance_url');
        String temp = (String) results.get('id');
        String[] splitUrl = temp.split('id');

        Id userId = UserInfo.getUserId();
        createDestinationOrgRecord(userId);
    }

    /**
     * @description  : to create record for logged in destination org
     * @param        : userId
     * @return       : none
     **/
    @TestVisible
    private static void createDestinationOrgRecord(Id userId){
        List<DestinationOrg__c> destOrgList = new List<DestinationOrg__c>();
        //Update/Create destination org details
        destOrgList = [SELECT Id, CreatedById, Name, OrgUrl__c, OrgType__c, Access_Token__c
                       FROM DestinationOrg__c
                       WHERE CreatedById = :userId and OrgUrl__c = :orgUrl];
                       //WITH SECURITY_ENFORCED]
                       
        List<DestinationOrg__c> destOrgNewList = new List<DestinationOrg__c>();
        Integer flag = 0;
        if (!destOrgList.isEmpty()) {
            for (DestinationOrg__c dest : destOrgList) {
                dest.Active__c = true;
                dest.Access_Token__c = token;
                flag = 1;
                destOrgNewList.add(dest);
            }
        }
        if (flag == 0 || destOrgList.isEmpty()){

            DestinationOrg__c destOrg = new DestinationOrg__c(Name = companyId, OrgUrl__c = orgUrl,
                                        Access_Token__c = token, Active__c = true);
                //Check if the current user has create permission
                //commenting access check as the qa user do not have access to the object/fields.
                SObjectAccessDecision securityDecision = Security.stripInaccessible(AccessType.CREATABLE, 
                    new List<DestinationOrg__c>{destOrg});
                INSERT securityDecision.getRecords();

            //Create remote site setting asynchronously as community user doesnot have access to create metadata

            createRemoteSite(securityDecision.getRecords()[0].Id,orgUrl); 
        }
        if (!destOrgNewList.isEmpty()){
            //Check if the current user has create permission
            //commenting access check as the qa user do not have access to the object/fields.
            SObjectAccessDecision securityDecision = Security.stripInaccessible(AccessType.UPSERTABLE, destOrgNewList);
            UPSERT securityDecision.getRecords();
        }
    }

    /**
    * @description  : Get access token from code
    * @author       : CEPTES | 11-30-2022 
    * @param        : baseUrl, code
    * @return       : HttpResponse 
    **/
    private static HttpResponse getToken(String baseUrl, String code){
        List<ApexPage> ap = [select NamespacePrefix,Name from ApexPage where Name =:'StoreDestinationOrgCodeVF'];
        String apexPage='';
        if(ap[0].NamespacePrefix != null){
            apexPage = ap[0].NamespacePrefix+'__'+ap[0].Name; 
        }else{
            apexPage = ap[0].Name;
        }
        Http http = new Http();
        HttpRequest req = new HttpRequest();
        String messageBody = 'code=' + code + '&client_id=' + MANAGE_PERMISSIONS_MDT_RECS.Client_Id__c + '&client_secret=' + MANAGE_PERMISSIONS_MDT_RECS.Client_Secret__c + 
                         '&redirect_uri=' + MYORG_URL + '/apex/'+apexPage + '&grant_type=authorization_code'; //changes
        system.debug('@@messageBody-='+messageBody);
        req.setHeader('content-type', 'application/x-www-form-urlencoded');
        req.setHeader('Content-length', String.valueOf(messageBody.length()));
        req.setMethod('POST');
        req.setEndpoint(baseUrl + '/services/oauth2/token');
        req.setBody(messageBody);
        HttpResponse response = http.send(req);
        return response;
    }
    @future(callout=true)
    public static void createRemoteSite(String recordId, String orgUrl){
        String json ='{"FullName":"' + 'Apex_'+ recordId + '","Metadata":{"disableProtocolSecurity":false,"isActive":true,"url":"' + orgUrl + '","urls":null,"description":"created from apex"}}';
        String endpoint = URL.getSalesforceBaseUrl().toExternalForm()+'/services/data/v41.0/tooling/sobjects/RemoteProxy/';
        string method  = 'POST';

        HttpRequest request = new HttpRequest();
        request.setHeader('Authorization', 'Bearer ' + UserInfo.getSessionID());
        request.setHeader('Content-Type', 'application/json');
        request.setEndpoint(endpoint);
        request.setMethod(method);
        request.setBody(json);
        Http http = new Http();
        HttpResponse response = http.send(request);
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
            system.debug('@@results-='+ results);
        }

    }
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
}