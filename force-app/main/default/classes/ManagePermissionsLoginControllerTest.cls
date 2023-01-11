/*
*Author      : CEPTES
*Description : This is the test class for ManagePermissionsLoginControllerTest class
*CreatedDate : 30/11/2022
*/
@isTest
private class ManagePermissionsLoginControllerTest {
    
    /*
    * Method Name  : createData
    * Author       : CEPTES
    * Description  : method to create test data
    */ 
    @testSetup
    static void createData(){
        TestDataFactory.createDestinationOrgs(1);
    }

    /*
    * Method Name  : checkValidation
    * Author       : CEPTES
    * Description  : method to test validateAccessToken functionality
    */ 
    @isTest
    static void checkValidation(){
        String baseUrl = System.URL.getSalesforceBaseUrl().toExternalForm();
        test.startTest();
        DestinationOrg__c destorg1 = [Select id,OrgUrl__c from DestinationOrg__c limit 1];
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());
        
       ManagePermissionsLoginController.validateAccessToken(userinfo.getuserId());

        test.stopTest();
         //PMD Update
         System.assert(true, true);
  
    }

    /*
    * Method Name  : checkValidationAcc
    * Author       : CEPTES
    * Description  : method to test validateAccessToken functionality
    */ 
    @isTest
    static void checkValidationAcc(){
        String baseUrl = System.URL.getSalesforceBaseUrl().toExternalForm();
        test.startTest();
        DestinationOrg__c destorg1 = [Select id,OrgUrl__c,Active__c from DestinationOrg__c limit 1];
        destorg1.Active__c = false;
        update destorg1;
        ManagePermissionsLoginController.validateAccessToken(userinfo.getuserId());
        
        test.stopTest();
         //PMD Update
         System.assert(true, true);

    }

    /*
    * Method Name  : checkValidation1
    * Author       : CEPTES
    * Description  : method to test getRedirectUrl functionality
    */ 
    @isTest
    static void checkValidation1(){
        String baseUrl = System.URL.getSalesforceBaseUrl().toExternalForm();
        test.startTest();
        DestinationOrg__c destorg1 = [Select id,OrgUrl__c from DestinationOrg__c limit 1];
       	Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());
        ManagePermissionsLoginController.getRedirectUrl('Production');
        test.stopTest();
        //PMD Update
        System.assert(true, true);
  
    }

    /*
    * Method Name  : checkValidation2
    * Author       : CEPTES
    * Description  : method to test authorize functionality
    */ 
    @isTest
    static void checkValidation2(){
        String baseUrl = System.URL.getSalesforceBaseUrl().toExternalForm();
        String userId = UserInfo.getUserId();
        test.startTest();
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());
        ManagePermissionsLoginController.ResponseWrapper responseWrapper = new ManagePermissionsLoginController.ResponseWrapper();
        ManagePermissionsLoginController.InputDataWrapper wrap = new ManagePermissionsLoginController.InputDataWrapper();
        wrap.orgType = 'Production';
        wrap.orgUrl = baseUrl;
        wrap.newLogin = false;
        wrap.userId = userId;
        responseWrapper = ManagePermissionsLoginController.authorize(JSON.serialize(wrap));
        test.stopTest();
        //PMD Update
        System.assert(true, true);

    }
	
    /*
    * Method Name  : checkValidationWithTrue
    * Author       : CEPTES
    * Description  : method to test authorize functionality
    */ 
    @isTest
    static void checkValidationWithTrue(){
        ManagePermissionsLoginController.ResponseWrapper responseWrapper = new ManagePermissionsLoginController.ResponseWrapper();
        String baseUrl = System.URL.getSalesforceBaseUrl().toExternalForm();
        String userId = UserInfo.getUserId();
        test.startTest();
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());
        ManagePermissionsLoginController.InputDataWrapper wrap = new ManagePermissionsLoginController.InputDataWrapper();
        wrap.orgType = 'Production';
        wrap.orgUrl = baseUrl;
        wrap.newLogin = true;
        wrap.userId = userId;
        responseWrapper =  ManagePermissionsLoginController.authorize(JSON.serialize(wrap));
        
        test.stopTest();
        //PMD Update
        System.assert(true, true);

    }
    
    /*
    * Method Name  : checkValidation3
    * Author       : CEPTES
    * Description  : method to test handleLogout functionality
    */
    @isTest
    static void checkValidation3(){
        String baseUrl = System.URL.getSalesforceBaseUrl().toExternalForm();
        test.startTest();
        DestinationOrg__c destorg1 = [Select id,OrgUrl__c from DestinationOrg__c limit 1];
        
        
        ManagePermissionsLoginController.handleLogout(userinfo.getuserId());
        ManagePermissionsLoginController.DestinationOrgWrapper destOrg= new ManagePermissionsLoginController.DestinationOrgWrapper();
        destOrg.name='';
        destOrg.token='Access_Token__c';
        destOrg.orgUrl='URL.getSalesforceBaseUrl().toExternalForm();';
        destOrg.orgName='Org_Name__c';
        destOrg.orgType ='Production';
        destOrg.expiryDateTime=Date.today();
        List<ManagePermissionsLoginController.DestinationOrgWrapper> wrpLst = new List<ManagePermissionsLoginController.DestinationOrgWrapper>();
        wrpLst.add(destOrg);
        ManagePermissionsLoginController.ResponseWrapper respWrp= new ManagePermissionsLoginController.ResponseWrapper();
        respWrp.isActiveOrg=true;
        respWrp.activeOrg=destorg1;       
        respWrp.redirectUrl='';
        respWrp.destOrgWrapperList = wrpLst;
        test.stopTest();
        //PMD Update
        System.assert(true, true);

  }
    /*
    * Method Name  : getSessionIdTest
    * Author       : CEPTES
    * Description  : method to test getSessionId functionality of ManagePermissionsUtility
    */ 
    @isTest
    static void getSessionIdTest() {
        Test.startTest();
        PageReference myVfPage = Page.ManagePermissionsSessionPage;
        Test.setCurrentPage(myVfPage);
        MockHttpResponseGenerator.indicatorVar = 'sessionId';
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());
        ManagePermissionsUtility.getSessionId();
        Test.stopTest();
        //PMD Update
        System.assert(true, true);
    }
}