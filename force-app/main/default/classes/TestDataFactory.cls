/*
*Author      : CEPTES
*Description : This is the test data factory class for all the test classes
*CreatedDate : 30/11/2022
*/
public with sharing class TestDataFactory {
    //Custom Labels are added to make them available in the package
    public static List<String> labels = new List<String>{System.Label.Fetch_Mass_Permission_Data,
                                        System.Label.FieldAccessLabel,
                                        System.Label.FieldPermissionRetrieveSuccess,
                                        System.Label.FieldPermissionSaveFailed,
                                        System.Label.FieldPermissionSaveSuccess,
                                        System.Label.Login,
                                        System.Label.LoginFailure,
                                        System.Label.Logintodestination,
                                        System.Label.LogoutSuccess,
                                        System.Label.ManageField,
                                        System.Label.Manage_Save_Changes,
                                        System.Label.MassFieldSaveChunk,
                                        System.Label.MassObjectFetchChunk,
                                        System.Label.MassObjectSaveChunk,
                                        System.Label.MassPermissionsSaveButton,
                                        System.Label.Mass_Object_Saved,
                                        System.Label.ObjectAccesslabel,
                                        System.Label.RecordTypeSelectWarning,
                                        System.Label.SelectObjectLabel,
                                        System.Label.SelectObjectWarning,
                                        System.Label.SelectProfileandPermissionSetLabel,
                                        System.Label.SelectProfileandPermissionSetwarning};
    /*
    * Method Name  : createAccounts
    * Author       : CEPTES
    * Description  : method to create test accounts data
    */ 
    public static List<Account> createAccounts(Integer count) {
        List<Account> accList = new List<Account>();
        Account acc;
        for(Integer i=0; i < count; i++) {
            acc = new Account(Name = 'Test'+count, ShippingStreet = 'TestStreet'+count, ShippingCity = 'TestCity'+count, 
                    ShippingState = 'TestState'+count, ShippingCountry = 'TestCountry'+count);
            accList.add(acc);        
        }
        INSERT accList;
        return accList;
    }

    /*
    * Method Name  : createContacts
    * Author       : CEPTES
    * Description  : method to create test contacts data
    */ 
    public static List<Contact> createContacts(Integer count) {
        List<Account> accList = createAccounts(1);
        List<Contact> conList = new List<Contact>();
        Contact con;
        for(Integer i=0; i < count; i++) {
            con = new Contact(LastName = 'Test'+count, AccountId = accList[0].Id);
            conList.add(con);        
        }
        INSERT conList;
        return conList;
    }
    
    /*
    * Method Name  : createDestinationOrgs
    * Author       : CEPTES
    * Description  : method to create test destination org data
    */ 
    public static List<DestinationOrg__c> createDestinationOrgs(Integer count) {
        List<DestinationOrg__c> destOrgList = new List<DestinationOrg__c>();
        DestinationOrg__c destOrg;
        for(Integer i=0; i < count; i++) {
            DestinationOrg__c org= new DestinationOrg__c();
            org.Access_Token__c = Userinfo.getSessionId();
            org.Active__c = true;
            org.Name = 'test';
            org.OrgType__c = 'Production';
            org.OrgUrl__c = System.URL.getSalesforceBaseUrl().toExternalForm();
            destOrgList.add(org);
        }
        INSERT destOrgList;
        return destOrgList;
    }
}