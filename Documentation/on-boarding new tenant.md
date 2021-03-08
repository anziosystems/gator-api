# On-boarding a new customer

There are two kind of organization is DevStar. One is Tenant Org e.g. AxleInfo and then there are Git Organization e.g Labshare, NCATS etc. Tenant (org) and Git Org are connected thru OrgLink Table. Hydration process updates this table.

![DB Tabels](Images/Org.PNG "USer Org")

For example, we are on-boarding T-Mobile. Here are the following steps we need to on-board a new client:

## Step - 1:  Configure AZure DevStar AD for new Customer (T-Mobile).
[Here](https://rainiersyscom-my.sharepoint.com/:v:/g/personal/rafat_anziosystems_com/EdoRfTO7KQNIqj11mFwksqgByBhysJRpoFTrsJaWv5XUvA?e=iUewhY) is the screencast.

## Step - 2: Update DB 
OrgLink Table for the Tenant and Git Repo.
```
insert into OrgLink (Org, LinkedOrg) values ('T-Mobile', 'GitOrgName')
```
## Step - 3: Hydrate.
Open the Dev-Star app. Click on Admin and then click on Hydrate buttons
  ![DB Tabels](Images/hydrate.png "JiraHook")

## Step - 4: User Login.
Let users login in Dev Star.

## Step - 5: Connect your Id
Connect your Id![connect your Id](Images/connectIds.png "Connect your Id")

## Step - 6: Add Admins
Click on Admin -> Administrator and choose admins for the tenant 
[define Admins](Images/admins.PNG "define admin")

## Step - 7: Make Org Chart.
Click on  org Chart and make the Org Chart.

## Step - 5: (optional) Configure Azure Market place for Dev-Star. 
[Here](https://rainiersyscom-my.sharepoint.com/:f:/g/personal/rafat_anziosystems_com/EshmX1EFuvJLoVrbyUXJxgIB0BTayyTqWQuYDk-UNFCNzA?e=yAlUOL) is the link for the screen cast.


