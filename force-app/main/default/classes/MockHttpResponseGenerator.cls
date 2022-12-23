@isTest
public class MockHttpResponseGenerator implements HttpCalloutMock {
    public static String indicatorVar;
    // Implement this interface method
    public HTTPResponse respond(HTTPRequest req) {
        // Create a fake response
        HttpResponse res = new HttpResponse();
        
        if(indicatorVar == 'https://login.salesforce.com') {
            res.setHeader('Content-Type', 'application/json');
            res.setBody('{"access_token":"test!test", "instance_url":"https://test.com","id":"id","IsSandbox":"false", "Name":"Test"}'); 
            //({IsSandbox=false, Name=Ceptes Software Pvt. Ltd., attributes={type=Organization, url=/services/data/v55.0/sobjects/Organization/00D6F000002X2ibUAC}})

            res.setStatusCode(200);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setBody('{"example":"test"}');
            res.setStatusCode(200);
        }
        return res;
    }
}