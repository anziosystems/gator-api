# Internal Design

![DB Tabels](Images/DBTables.PNG "DB Tables")

# Table - Users 

This table keeps all the information about the user. Id is from LSAuth and it is unique across all the tenants. This table is updated when user signs in. GitUserName, JiraUserName, and TfsUserName is updated later by individual user using the admin in GG Screen. After this table another call(SaveUserOrg) is made from the Passport file in BE to update **UserOrg**. This table Org is actually **Tenant** for the OrgType = 'org'. This table also keeps Git Org for the user name. Git Org OrgType = 'Git'.  

>OAuth token is also kept here. User Id is send to client as Auth Token. When the client calls back BE (Backend) it put this token in the header. BE gets the Id from the Header calls the BE to get the token and then make the calls to any of the services in BE. 

# Table - PullRequestDetails 

This table is updated by GitWebhook. This table is also filled by at the time of hydration for the first use.


# UI Data Flow

There are two kind of organization is DS. One is Tenant Org e.g. AxleInfo and then there are Git Organization e.g Labshare, NCATS etc. Tenant (org) and Git Org are connected thru OrgLink Table. Hydration process updates this table.

![DB Tabels](Images/Org.PNG "USer Org")

**GetOrg** calls SP **getOrg4UserId**, which Connects OrgLink and Org Table for the user and get all the Git Org and Tenant Org. It returns data as such
```
[
    {"Org":"axleinfo.com","DisplayName":"axleinfo.com","OrgType":"org"},
    {"Org":"LabShare","DisplayName":"LabShare","OrgType":**"git"**},
    {"Org":"ncats","DisplayName":"National Center for Advancing Translational Sciences","OrgType":**"git"** }
]
```
> Most of the call from UI has TenantOrg or GitOrg in API calls

> How the two tenants are merged e.g. Labshare and AxleInfo?
This merge happen at the user logged in time. Labshare user Org(Tenant) is saved as AxleInfo. There is LabShare tenant and then there is a Git org called 'Labshare'. However, in DB Labshare Tenant is rolled into AxleInfo. 

>When we have to Roll a NIH user to one of the Tenant, we have to update this user org in UserOrg table. For example, Mariam can login system using her NIH credential and her information will be saved in Users table, then we have to manually update the UserOrg table for her.  Later on this can be done thru a screen in Admin



**GetUser4Org**?org=axleinfo.com for the Org(Tenant). Get all the Users for the Org from UserOrg and then join with Users and get all Users attributes.



![DB Tabels](Images/GetUser4Org.PNG "USer Org")


First screen of Git activity calls TopDevForLastXDays BE API. which calls SP **TopDevForLastXDays** SP. This SP depend upon TopDevVW. Which actually depend up on **vwOpenClosePR** and User. vwOpenClosePR pulls data from **PullRequestDetails** table and Users. PullRequestDetails and Users connected on Users.GituserName and Login. Data is filtered on GitOrg, and the org is picked up from PullRequestDetails.

![DB Tabels](Images/TopDev4LastXDays.PNG "DB Tables")

and when user clicks on the Dev name in Git context, **PullRequest4Dev** API is called, which in turn calls **getPR4Dev** which calls SP **PR4Devs**, which in turn pulls data from  **vwOpenClosePR**

When user clicks on dev name in "Jira Context", **GetJiraData** is called which in turn pulls the data from **JiraData**

## SP - GetTopRespositories4XDays

**GetTopRepos4XDays** SP is called. Which is depended on  **vwOpenClosePR**

# USer Session Store
USer session store stores the followings:

![DB Tabels](Images/sessionStore.PNG "Session Store")

GG extensively uses this infomation about the logged in user and the Current-dev which changes as logged in user clicks aroud on different users. 

current-org is Tenant Org. 

As use clicks on Git/Jira and TFS, current-context changes accordingly.

# MSR - Reporting
At the time out insert ReportCreationDate is updated.
Every action on MSR table is logged into RSR table. RSR is Report table for Status Reports.
RSR table keeps the reportId, and who has changed the report last.

ManagerStatus has the following values

ACHIEVED = 3;
NEEDIMPROVEMENT = 1;
EXCEED = 7;

To get the history of all the report change look at SR_R_View. SR_R_View ReviewerId has one reviewer per row. MSR Reviewer has both the reviewers.


# User Roles
So far there are two roles -  Admin and MSRAdmin.Roles are kept in USerRoles.

## Admin 
Admin can change the Org Tree. Add other admins. Run the hydrate function for the org.

## MSRAdmin

MSRAdmin see all the reports in the org. 

They also see all the reviews.




# How the hooks work

## Hook Data Flow
Jira send the data to Hook endpoint and TFS send the data to TFSHook endpoint

https://gator-api-ppe.azurewebsites.net/service/Hook

https://gator-api-ppe.azurewebsites.net/service/TFSHook

These API save the data into HookRawData Table. (JIRA and TFS Should have a separate tables)

Service/Hook -> saveRawHookData -> Saves the data and then calls ->  processAllHookData

processAllHookData -> processJiraHookData -> processTFSHookData -> updateJiraData -> Deleted the data from HookRawData if successfull.


## JIRA 
All Jira hooks send the data to HookRawData table. 

Hook is put in Jira
https://gator-api-ppe.azurewebsites.net/service/Hook


Registering a webhook via the [Jira administration console](https://community.atlassian.com/t5/Jira-Software-questions/How-do-I-access-the-Jira-administration-console/qaq-p/824434)
        <ul>
          <li>Go to Jira administration console > System > Webhooks (in the Advanced section).</li>
          <li>To register your webhook, click Create.</li>
          Please select the radio buttons as shown in the below image
          ![DB Tabels](Images/Jira-Hook.png "JiraHook")
        </ul>

## GIT

Without webhooks Dev Star will not update your data. Please ask the admin of your orgnization to install webhook. 
        Follow these simple steps to Manually Install web hook?
        <ul>
          <li>Goto your organization page on the github <br /></li>
          <li>Navigate to the "Settings" tab. <br /></li>
          <li>Select the "Webhooks" option on the left menu. <br /></li>
          <li>Click "Add Webhook" <br /></li>
          <li>put 'https://gatorgithook.azurewebsites.net/api/httptrigger' in payload URL <br /></li>
          <li>Select "application/json" as the encoding type. <br /></li>
          <li>select radio button 'Let me select individual events.' <br /></li>
          <li>check 'Pull requests' <br /></li>
          <li>click on Add webhook <br /></li>
        </ul>

This hook will put data directly in PullRequestDetails table.
![DB Tabels](Images/GitHook-1.png "GitHook")
![DB Tabels](Images/GitHook-2.png "GitHook")

### For Hydration of Git Data

Goto GitHub -> Settings -> OAuthApp

And setup the following values
Set Authorization callback to the following link:

https://gator-api-ppe.azurewebsites.net/auth/github/redirect

## Azure DevOps - Azure Boards

Follow these simple steps to Manually Install web hook?
![DB Tabels](Images/TFS1.png "TFS")
        
Click on "+" sign to add a new web hook, as shown in above image.
![DB Tabels](Images/TFS1.png "TFS1A")


Click Next

![DB Tabels](Images/TFS2.png "TFS1A")

NOTE: Please remember you have to create total of three webhooks, one for created, deleted and updated.
Please make sure to add the following (https://gator-api-ppe.azurewebsites.net/service/Hook) in the URL as shown in below image.
![DB Tabels](Images/TFS3.png "TFS1A")
Please remember you have to create total of three webhooks, one for created, deleted and updated.

## hydrate

Once you installed the webhooks, data will start trickling in. Dev Star have an option to hydrate with some historical data right away. For that go to Admin screen, and click on "Hydrate" option. Hydrate option will work in background and pull data in. It may take couple of minutes to hours, depending upon the data size.

          
With time data in Dev Star will grow and it will become more and more valuable tool for your organization.
