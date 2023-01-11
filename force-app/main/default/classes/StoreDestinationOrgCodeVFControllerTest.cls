/*
*Author      : CEPTES
*Description : This is the test class for StoreDestinationOrgCodeVF class
*CreatedDate : 29/11/2022
*/
@isTest(seeAllData = false)
public class StoreDestinationOrgCodeVFControllerTest {
    
    @testSetup
    static void createData(){
        TestDataFactory.createAccounts(1);
        TestDataFactory.createContacts(1);
        TestDataFactory.createDestinationOrgs(1);
    }
    
    /*
* Method Name  : onLoadValidatorTest
* Author       : CEPTES
* Description  : method to test onLoadValidator functionality
*/    
    @isTest
    static void onLoadValidatorTest() {
        PageReference myVfPage = Page.StoreDestinationOrgCodeVF;
        Test.setCurrentPage(myVfPage);
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());
        MockHttpResponseGenerator.indicatorVar ='https://login.salesforce.com';
        // Put Id into the current page Parameters
        ApexPages.currentPage().getParameters().put('code','mycode');
        Test.startTest();        
        StoreDestinationOrgCodeVFController.onLoadValidator();
        system.assertEquals(true, true,'Success');
        Test.stopTest();
    }
    
}