Create enviorenment vaiables as follows:

      clientID:  process.env.GITHUB_ClientID, //keys.github.clientID,
      clientSecret: process.env.GITHUB_ClientSecret,
      this.sqlConfigSetting.server = process.env.SQL_Sever;
      this.sqlConfigSetting.database = process.env.SQL_Database ;
      this.sqlConfigSetting.user = process.env.SQL_User;
      this.sqlConfigSetting.password = process.env.SQL_Password;
      this.sqlConfigSetting.port = 1433;
      this.sqlConfigSetting.encrypt = true;



      To run the API do the followings
      ================================

      Npm install
      Npm run build
      or 
      npm run-script build

      for ng error 
      npm install -g @angular/cli      

      Npm start

      execution error
      Set-ExecutionPolicy -Scope "CurrentUser" -ExecutionPolicy "RemoteSigned"

      
      npm i dotenv

      API listens on port 3000, defined in app.ts

      To run this service is in docker
      ===============================
      Build an image
      docker build -t gator-api-image .

      Run the container
      docker run --name gator-api-container -p 3000:3000 gator-api-image

      Some other docker commands
      ==========================

      List images
      Docker images

      Remove an image
      docker rmi gator-api-image

      Prune old containers
      docker system prune -f

      Remove a container
      docker rm gator-api-container9

      Kill a container
      docker kill gator-api-container9

      List all dockers
      docker ps -a

      Go inside docker
      docker run -ti gator-api-image bash
