Create enviorenment vaiables as follows:

      clientID:  process.env.GITHUB_ClientID, //keys.github.clientID,
      clientSecret: process.env.GITHUB_ClientSecret,
      this.sqlConfigSetting.server = process.env.SQL_Sever;
      this.sqlConfigSetting.database = process.env.SQL_Database ;
      this.sqlConfigSetting.user = process.env.SQL_User;
      this.sqlConfigSetting.password = process.env.SQL_Password;
      this.sqlConfigSetting.port = 1433;
      this.sqlConfigSetting.encrypt = true;
