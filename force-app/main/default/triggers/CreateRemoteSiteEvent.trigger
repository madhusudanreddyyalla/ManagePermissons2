trigger CreateRemoteSiteEvent on CreateRemoteSiteSetting__e (after insert) {
    if(Trigger.isAfter && Trigger.isInsert) {
    	ManagePermissionsUtility.createRemoteSiteSettings(Trigger.New);
    }
    
}