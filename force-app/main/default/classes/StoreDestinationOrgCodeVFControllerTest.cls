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
        Test.stopTest();
    }
    
    /*
* Method Name  : onLoadValidatorTest
* Author       : CEPTES
* Description  : method to test onLoadValidator functionality
*/    
    @isTest
    static void onLoadValidatorWithDestOrgTest() {
        
        UserRole portalRole = [Select Id From UserRole Where PortalType = 'None' Limit 1];
        system.debug('portalRole is ' + portalRole);
        
        Profile profile1 = [Select Id from Profile where name = 'System Administrator'];
        User portalAccountOwner1 = new User(
            UserRoleId = portalRole.Id,
            ProfileId = profile1.Id,
            Username = System.now().millisecond() + 'test2@test.com',
            Alias = 'batman',
            Email='bruce.wayne@wayneenterprises.com',
            EmailEncodingKey='UTF-8',
            Firstname='Bruce',
            Lastname='Wayne',
            LanguageLocaleKey='en_US',
            LocaleSidKey='en_US',
            TimeZoneSidKey='America/Chicago'
        );
        Database.insert(portalAccountOwner1);
        
        //User u1 = [Select ID From User Where Id =: portalAccountOwner1.Id];
        
        System.runAs ( portalAccountOwner1 ) {
            //Create account
            Account portalAccount1 = new Account(
                Name = 'TestAccount',
                OwnerId = portalAccountOwner1.Id
            );
            Database.insert(portalAccount1);
            
            //Create contact
            Contact contact1 = new Contact(
                FirstName = 'Test',
                Lastname = 'McTesty',
                AccountId = portalAccount1.Id,
                Email = System.now().millisecond() + 'test@test.com'
            );
            Database.insert(contact1);
            DestinationOrg__c destOrg = [SELECT Id, Access_Token__c, Active__c, Name, OrgType__c FROM DestinationOrg__c LIMIT 1];
            UPDATE destOrg;
            
            PageReference myVfPage = Page.StoreDestinationOrgCodeVF;
            Test.setCurrentPage(myVfPage);
            Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());
            MockHttpResponseGenerator.indicatorVar ='https://login.salesforce.com';
            // Put Id into the current page Parameters
            ApexPages.currentPage().getParameters().put('code','mycode');
            Test.startTest();
            
            StoreDestinationOrgCodeVFController.onLoadValidator();
            Test.stopTest();
        }
    }
    
}