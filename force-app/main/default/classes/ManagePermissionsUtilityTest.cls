@isTest
public class ManagePermissionsUtilityTest {
	
    @isTest
    public static void getStringFormatedTest(){
        	String sessionId = Userinfo.getSessionId();
            String baseUrl = System.URL.getSalesforceBaseUrl().toExternalForm();
 			List<String> selectedObjectNames = new List<String>{'Account','Contact'};
         Test.startTest();
            Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());
            ManagePermissionsUtility.RestInputWrapper wrap = new ManagePermissionsUtility.RestInputWrapper();
            wrap.accessToken = sessionId;
            wrap.baseUrl = baseUrl;
            wrap.method ='GET';
          	ManagePermissionsUtility.getStringFormated(selectedObjectNames,'SobjectType');
        	String result = ManagePermissionsUtility.getRestResponse(JSON.serialize(wrap));
        	StoreDestinationOrgCodeVFController.getNewOrgDetails(sessionId,baseUrl);
        //ManagePermissionsUtility.getNewOrgDetails(sessionId,baseUrl);
        Test.StopTest();
    }
    
    
}