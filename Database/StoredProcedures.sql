/****** Object:  Database [git]    Script Date: 6/1/2019 5:21:46 AM ******/
CREATE DATABASE [gator]
(EDITION = 'Standard', SERVICE_OBJECTIVE = 'S0', MAXSIZE = 250 GB)
WITH CATALOG_COLLATION = SQL_Latin1_General_CP1_CI_AS;
GO
ALTER DATABASE [git] SET ANSI_NULL_DEFAULT OFF 
GO
ALTER DATABASE [git] SET ANSI_NULLS OFF 
GO
ALTER DATABASE [git] SET ANSI_PADDING OFF 
GO
ALTER DATABASE [git] SET ANSI_WARNINGS OFF 
GO
ALTER DATABASE [git] SET ARITHABORT OFF 
GO
ALTER DATABASE [git] SET AUTO_SHRINK OFF 
GO
ALTER DATABASE [git] SET AUTO_UPDATE_STATISTICS ON 
GO
ALTER DATABASE [git] SET CURSOR_CLOSE_ON_COMMIT OFF 
GO
ALTER DATABASE [git] SET CONCAT_NULL_YIELDS_NULL OFF 
GO
ALTER DATABASE [git] SET NUMERIC_ROUNDABORT OFF 
GO
ALTER DATABASE [git] SET QUOTED_IDENTIFIER OFF 
GO
ALTER DATABASE [git] SET RECURSIVE_TRIGGERS OFF 
GO
ALTER DATABASE [git] SET AUTO_UPDATE_STATISTICS_ASYNC OFF 
GO
ALTER DATABASE [git] SET ALLOW_SNAPSHOT_ISOLATION ON 
GO
ALTER DATABASE [git] SET PARAMETERIZATION SIMPLE 
GO
ALTER DATABASE [git] SET READ_COMMITTED_SNAPSHOT ON 
GO
ALTER DATABASE [git] SET  MULTI_USER 
GO
ALTER DATABASE [git] SET ENCRYPTION ON
GO
ALTER DATABASE [git] SET QUERY_STORE = ON
GO
ALTER DATABASE [git] SET QUERY_STORE (OPERATION_MODE = READ_WRITE, CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30), DATA_FLUSH_INTERVAL_SECONDS = 900, INTERVAL_LENGTH_MINUTES = 60, MAX_STORAGE_SIZE_MB = 100, QUERY_CAPTURE_MODE = AUTO, SIZE_BASED_CLEANUP_MODE = AUTO)
GO
/****** Object:  Table [dbo].[PullRequestDetails]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PullRequestDetails]
(
	[Id] [VARCHAR](200) NOT NULL,
	[Org] [VARCHAR](200) NOT NULL,
	[Repo] [VARCHAR](200) NOT NULL,
	[url] [VARCHAR](2000) NOT NULL,
	[State] [VARCHAR](50) NOT NULL,
	[Action] [VARCHAR](50) NOT NULL,
	[Title] [VARCHAR](2000) NULL,
	[Created_At] [DATETIME] NOT NULL,
	[Body] [VARCHAR](2000) NOT NULL,
	[Login] [VARCHAR](100) NOT NULL,
	[Avatar_Url] [VARCHAR](2000) NOT NULL,
	[User_Url] [VARCHAR](2000) NOT NULL,
	[LastUpdated] [DATETIME] NULL,
	CONSTRAINT [PK_PullRequestDetails_1] PRIMARY KEY CLUSTERED 
(
	[Id] ASC,
	[State] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[vwOpenClosedPR]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/****** Script for SELECTTopNRows command FROM SSMS  ******/
CREATE VIEW [dbo].[vwOpenClosedPR]
AS
	SELECT DISTINCT Login, State, Action, Created_At, Repo, Avatar_Url, 
	CAST ( CAST (LastUpdated AS VARCHAR(12)) AS DATEtIME) AS LastUpdated, url, Org
	FROM dbo.PullRequestDetails
	WHERE  (State IN ('closed', 'open', 'opened', 'close', 'commit'))
GO
/****** Object:  Table [dbo].[Developers]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Developers]
(
	[TenantId] [VARCHAR](50) NOT NULL,
	[Org] [VARCHAR](200) NOT NULL,
	[Email] [VARCHAR](100) NULL,
	[Name] [VARCHAR](100) NULL,
	[login] [VARCHAR](100) NOT NULL,
	[AvatarUrl] [VARCHAR](2000) NULL,
	[LastUpdated] [DATETIME] NULL,
	CONSTRAINT [PK_Developers] PRIMARY KEY CLUSTERED 
(
	[TenantId] ASC,
	[Org] ASC,
	[login] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Tenant]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Tenant]
(
	[Id] [INT] NOT NULL,
	[Email] [VARCHAR](100) NULL,
	[UserName] [VARCHAR](100) NULL,
	[DisplayName] [VARCHAR](200) NULL,
	[ProfileUrl] [VARCHAR](2000) NULL,
	[LastUpdated] [DATETIME] NOT NULL,
	[Auth_Token] [VARCHAR](4000) NULL,
	[Refresh_Token] [VARCHAR](4000) NULL,
	[Photo] [VARCHAR](2000) NULL,
	CONSTRAINT [PK_Tenant] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[TenantOrg]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[TenantOrg]
(
	[TenantId] [INT] NOT NULL,
	[Org] [VARCHAR](200) NOT NULL,
	[LastUpdated] [DATETIME] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[TenantRepos]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[TenantRepos]
(
	[TenantId] [VARCHAR](50) NOT NULL,
	[RepoName] [VARCHAR](200) NOT NULL,
	[LastUpdated] [DATETIME] NOT NULL,
	[LastRefereshed] [DATETIME] NOT NULL,
	[Org] [VARCHAR](200) NOT NULL,
	[ID] [VARCHAR](100) NOT NULL,
	[Desc] [VARCHAR](200) NULL,
	[HomePage] [VARCHAR](2000) NULL,
	[Created_At] [DATETIME] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[VDevTeam]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[VDevTeam]
(
	[VirtualTeamId] [INT] IDENTITY(1,1) NOT NULL,
	[TeamName] [VARCHAR](100) NOT NULL,
	[TenantId] [VARCHAR](50) NOT NULL,
	[login] [VARCHAR](100) NOT NULL,
	[LastUpdated] [DATETIME] NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[VRepoTeam]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[VRepoTeam]
(
	[VirtualTeamId] [INT] IDENTITY(1,1) NOT NULL,
	[TeamName] [VARCHAR](100) NOT NULL,
	[TenantId] [VARCHAR](50) NOT NULL,
	[Repo] [VARCHAR](200) NOT NULL,
	[LastUpdated] [DATETIME] NOT NULL
) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_PullRequestDetails]    Script Date: 6/1/2019 5:21:46 AM ******/
CREATE NONCLUSTERED INDEX [IX_PullRequestDetails] ON [dbo].[PullRequestDetails]
(
	[Org] ASC,
	[Repo] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_TenantOrg]    Script Date: 6/1/2019 5:21:46 AM ******/
CREATE NONCLUSTERED INDEX [IX_TenantOrg] ON [dbo].[TenantOrg]
(
	[TenantId] ASC,
	[Org] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Developers] ADD  CONSTRAINT [DF_Developers_LastUpdated]  DEFAULT (GETDATE()) FOR [LastUpdated]
GO
ALTER TABLE [dbo].[PullRequestDetails] ADD  CONSTRAINT [DF_PullRequestDetails_LastUpdated]  DEFAULT (GETDATE()) FOR [LastUpdated]
GO
ALTER TABLE [dbo].[Tenant] ADD  CONSTRAINT [DF_Tenant_LastUpdated]  DEFAULT (GETDATE()) FOR [LastUpdated]
GO
ALTER TABLE [dbo].[TenantOrg] ADD  CONSTRAINT [DF_TenantOrg_LastUpdated]  DEFAULT (GETDATE()) FOR [LastUpdated]
GO
ALTER TABLE [dbo].[TenantRepos] ADD  CONSTRAINT [DF_TenantRepositories_LastUpdated]  DEFAULT (GETDATE()) FOR [LastUpdated]
GO
ALTER TABLE [dbo].[TenantRepos] ADD  CONSTRAINT [DF_TenantRepositories_LastRefereshed]  DEFAULT (GETDATE()) FOR [LastRefereshed]
GO
/****** Object:  StoredProcedure [dbo].[CheckTenant]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/****** Script for SELECTTopNRows command FROM SSMS  ******/
CREATE PROCEDURE [dbo].[CheckTenant]
	@Id INT
AS
Declare @Result int

SELECT @Result = Id
	FROM [dbo].[Tenant]
		WHERE Id= @Id

IF(@Result is NULL)
	Begin
	SELECT 0 as Result
	return;
END
ELSE 
	BEGIN
	SELECT CASE
			WHEN DATEDIFF(d,LastUpdated , GETDATE()) > 7 THEN 0 
	     	ELSE 1
		END AS Result
	FROM [dbo].[Tenant]
	WHERE Id= @Id
END
GO
/****** Object:  StoredProcedure [dbo].[GetAllRepoCollection4TenantOrg]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Rafat Sarosh
-- Create Date: 1/5/2019
-- Description:  
-- =============================================
CREATE PROCEDURE [dbo].[GetAllRepoCollection4TenantOrg]
	(
	@TenantId VARCHAR (50),
	@Org VARCHAR (200)
)
AS
BEGIN

	SELECT *
	FROM RepoCollections
	WHERE TenantId = @TenantId AND ORG = @Org

END
GO
/****** Object:  StoredProcedure [dbo].[GetOrg]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Rafat Sarosh
-- Create Date: 1/5/2019
-- Description:  
-- =============================================
CREATE PROCEDURE [dbo].[GetOrg]
	(
	-- Add the parameters for the stored procedure here
	@TenantId VARCHAR(50)
)
AS
BEGIN

	SELECT *
	FROM [dbo].[TenantOrg]
	WHERE TenantId = @TenantId


END
GO
/****** Object:  StoredProcedure [dbo].[GetPR4Repo]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[GetPR4Repo]
	(
	@org VARCHAR(200) ,
	@repo VARCHAR(200)
)
AS
BEGIN

	SELECT top 500
		*
	FROM [dbo].[PullRequestDetails]
	WHERE org = @org AND Repo = @repo

END
GO
/****** Object:  StoredProcedure [dbo].[GetPullRequestforId]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Rafat Sarosh
-- Create Date: 1/5/2019
-- Description:  
-- =============================================
CREATE PROCEDURE [dbo].[GetPR4Id]
	(
	-- Add the parameters for the stored procedure here
	@Id int,
	@Org VARCHAR(200)
)
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON

	SELECT *
	FROM [dbo].[PullRequestDetails]
	where [Id] = @Id AND Org = @Org





END
GO
/****** Object:  StoredProcedure [dbo].[GetRepoCollectionByName]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Rafat Sarosh
-- Create Date: 1/5/2019
-- Description:  
-- =============================================
CREATE PROCEDURE [dbo].[GetRepoCollectionByName]
	(
	@CollectionName VARCHAR(200)
)
AS
BEGIN

	SELECT *
	FROM RepoCollections
	WHERE CollectionName = @CollectionName

END
GO
/****** Object:  StoredProcedure [dbo].[GetRepos]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[GetRepos]
	(
	-- Add the parameters for the stored procedure here
	@TenantId VARCHAR(50),
	@Org VARCHAR(200)

)
AS
BEGIN
	SELECT *
	FROM TenantRepos
	WHERE TenantId = @TenantId AND Org = @Org

END
GO
/****** Object:  StoredProcedure [dbo].[GetRepositoryPR]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Rafat Sarosh
-- Create Date: 1/5/2019
-- Description:  
-- =============================================
CREATE PROCEDURE [dbo].[GetRepoPR]
	(
	-- Add the parameters for the stored procedure here
	@Day INT = 1,
	@Org VARCHAR(200),
	@Repo VARCHAR(200),
	@PageSize INT

)
AS
BEGIN
	SELECT DISTINCT TopRow.*, Pr.title as title, pr.Body as body,
		pr.Url as pullrequesturl,
		CAST(pr.Created_At as char(12)) as created_at, pr.Created_At as sortonthis
	FROM (
						SELECT * , ROW_NUMBER () Over (partition by Org ORDER BY   [LastUpdated] desc) as [ROW NUMBER]
		FROM [vwOpenClosedPR]
		WHERE LastUpdated BETWEEN  CAST( CAST(GETDATE() - @Day as char(12)) AS DateTime) AND  CAST( CAST (GETDATE() as char(12)) as DateTime)
			AND Org = @Org AND Repo = @Repo
						
						) AS TopRow JOIN PullRequestDetails PR ON 
							PR.Url = TopRow.Url
	WHERE  TopRow.[ROW NUMBER] <= @pageSize
	ORDER BY sortonthis DESC
END
GO
/****** Object:  StoredProcedure [dbo].[GetTenant]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


Create PROCEDURE [dbo].[GetTenant]
	(
	-- Add the parameters for the stored procedure here
	@Id INT
)
AS
BEGIN

	SELECT *
	FROM Tenant
	WHERE Id = @Id

END
GO
/****** Object:  StoredProcedure [dbo].[GetTopRespositories4XDays]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Rafat Sarosh
-- Create Date: 1/5/2019
-- Description:  
-- =============================================
CREATE PROCEDURE [dbo].[GetTopRepos4XDays]
	(
	-- Add the parameters for the stored procedure here
	@Day int = 1,
	@Org VARCHAR(200)
)
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON

	SELECT [Repo], count(*) ctr
	FROM [vwOpenClosedPR]
	WHERE 
			LastUpdated BETWEEN  CAST( CAST(GETDATE() - @Day as char(12)) AS DateTime) AND  CAST( CAST (GETDATE() as char(12)) as DateTime)
		AND Org = @Org
	GROUP BY  [Repo]
	ORDER BY   ctr desc


END
GO
/****** Object:  StoredProcedure [dbo].[LongestPullRequest]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Rafat Sarosh
-- Create Date: 1/5/2019
-- Description:  
-- =============================================
CREATE PROCEDURE [dbo].[LongestPR]
	(
	-- Add the parameters for the stored procedure here
	@Day int = 1,
	@Org VARCHAR(200)
)
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON

	SELECT [Id], DATEDIFF(day, [Created_At], [LastUpdated] ) duration
	FROM [dbo].[PullRequestDetails]
	where state = 'closed' AND Org = @Org AND LastUpdated BETWEEN GETDATE() - @Day AND GETDATE()
	ORDER BY   duration desc




END
GO
/****** Object:  StoredProcedure [dbo].[PullRequest4Devs]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/* IFstate is null then get all the pull Request */
CREATE PROCEDURE [dbo].[PR4Devs]
	(
	@Org VARCHAR(200),
	@login VARCHAR(100),
	@Action VARCHAR(50),
	@day int,
	@pageSize int
)
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON

	IF( @Action = 'null')
		BEGIN
		IF(@login = 'null' )
				BEGIN
			-- No login no action (for all pr )
			SELECT DISTINCT TopRow.*, Pr.title as title, pr.Body as body,
				pr.Url as pullrequesturl,
				CAST(pr.Created_At as char(12)) as created_at, pr.Created_At as sortonthis
			FROM (
						SELECT * , ROW_NUMBER () Over (partition by Org ORDER BY   [LastUpdated] desc) as [ROW NUMBER]
				FROM [vwOpenClosedPR]
				WHERE LastUpdated BETWEEN  CAST( CAST(GETDATE() - @Day as char(12)) AS DateTime) AND  CAST( CAST (GETDATE() as char(12)) as DateTime)
					AND Org = @Org
						
						) AS TopRow JOIN PullRequestDetails PR ON 
							PR.Url = TopRow.Url
			WHERE  TopRow.[ROW NUMBER] <= @pageSize
			ORDER BY sortonthis DESC
		END
		 ELSE  
				BEGIN
			-- all (open AND closed) pr per dev

			SELECT DISTINCT TopRow.*, Pr.title as title, pr.Body as body,
				pr.Url as pullrequesturl,
				CAST(pr.Created_At as char(12)) as created_at, pr.Created_At as sortonthis
			FROM (
						SELECT * , ROW_NUMBER () Over (partition by Org ORDER BY   [LastUpdated] desc) as [ROW NUMBER]
				FROM [vwOpenClosedPR]
				WHERE LastUpdated BETWEEN  CAST( CAST(GETDATE() - @Day as char(12)) AS DateTime) AND  CAST( CAST (GETDATE() as char(12)) as DateTime)
					AND Org = @Org
					AND login = @login
					AND (State = 'opened' OR State = 'open' OR State = 'closed' OR State = 'close' OR State = 'commit') 
						) AS TopRow JOIN PullRequestDetails PR ON 
							PR.Url = TopRow.Url
			WHERE  TopRow.[ROW NUMBER] <= @pageSize
			ORDER BY sortonthis DESC


		END
	END
	 ELSE  
		-- action is not null
		BEGIN
		IF(@login = 'null' )
				BEGIN
			-- No login but Action (for all pr )
			SELECT DISTINCT TopRow.*, Pr.title as title, pr.Body as body,
				pr.Url as pullrequesturl,
				CAST(pr.Created_At as char(12)) as created_at, pr.Created_At as sortonthis
			FROM (
						SELECT * , ROW_NUMBER () Over (partition by Org ORDER BY   [LastUpdated] desc) as [ROW NUMBER]
				FROM [vwOpenClosedPR]
				WHERE LastUpdated BETWEEN  CAST( CAST(GETDATE() - @Day as char(12)) AS DateTime) AND  CAST( CAST (GETDATE() as char(12)) as DateTime)
					AND Org = @Org
					AND (State = 'opened' OR State = 'open' OR State = 'closed' OR State = 'close' OR State = 'commit') 
						) AS TopRow JOIN PullRequestDetails PR ON 
							PR.Url = TopRow.Url
			WHERE  TopRow.[ROW NUMBER] <= @pageSize
			ORDER BY sortonthis DESC
		END
				 ELSE  
				BEGIN
			-- login AND  Action (for all pr  for particluar dev)
			SELECT DISTINCT TopRow.*, Pr.title as title, pr.Body as body,
				pr.Url as pullrequesturl,
				CAST(pr.Created_At as char(12)) as created_at, pr.Created_At as sortonthis
			FROM (
						SELECT * , ROW_NUMBER () Over (partition by Org ORDER BY   [LastUpdated] desc) as [ROW NUMBER]
				FROM [vwOpenClosedPR]
				WHERE LastUpdated BETWEEN  CAST( CAST(GETDATE() - @Day as char(12)) AS DateTime) AND  CAST( CAST (GETDATE() as char(12)) as DateTime)
					AND Org = @Org
					AND login = @login
					AND (State = 'opened' OR State = 'open' OR State = 'closed' OR State = 'close' OR State = 'commit') 
						) AS TopRow JOIN PullRequestDetails PR ON 
							PR.Url = TopRow.Url
			WHERE  TopRow.[ROW NUMBER] <= @pageSize
			ORDER BY sortonthis DESC

		END
	END


END
GO
/****** Object:  StoredProcedure [dbo].[PullRequestCountForLastXDays]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Rafat Sarosh
-- Create Date: 1/5/2019
-- Description:  
-- =============================================
CREATE PROCEDURE [dbo].[PRCount4LastXDays]
	(
	-- Add the parameters for the stored procedure here
	@Day int = 1,
	@Org VARCHAR(200)
)
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON

	SELECT state, count(*) ctr
	FROM (
	SELECT state
		FROM [vwOpenClosedPR]
		Where 
			LastUpdated BETWEEN  CAST( CAST(GETDATE() - @Day  as char(12)) AS DateTime) AND  CAST( CAST (GETDATE()  as char(12)) as DateTime)
			AND Org = @Org) T
	GROUP BY  state

END
GO
/****** Object:  StoredProcedure [dbo].[PullRequestForLastXDays]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Rafat Sarosh
-- Create Date: 1/5/2019
-- Description:  
-- =============================================
CREATE PROCEDURE [dbo].[PR4LastXDays]
	(
	-- Add the parameters for the stored procedure here
	@Day int = 1,
	@Org VARCHAR(200)
)
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON
	declare @ctr int
	SELECT *
	FROM [vwOpenClosedPR]
	WHERE 
			LastUpdated BETWEEN  CAST( CAST(GETDATE() - @Day as char(12)) AS DateTime) AND  CAST( CAST (GETDATE() as char(12)) as DateTime)
		AND Org = @Org
	return @ctr
END
GO
/****** Object:  StoredProcedure [dbo].[SaveDev]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Rafat Sarosh
-- Create Date: 1/5/2019
-- Description:  
-- =============================================
CREATE PROCEDURE [dbo].[SaveDev]
	(
	-- Add the parameters for the stored procedure here
	@TenantId INT,
	@Org VARCHAR(200),
	@email VARCHAR(100),
	@name VARCHAR(100),
	@login VARCHAR(100),
	@avatarUrl VARCHAR(2000)
)
AS
BEGIN

	IF EXISTS ( SELECT *
	FROM [dbo].Developers
	WHERE TenantId = @TenantId AND Org = @org AND [login] = @login)   
		BEGIN
		update Developers 
			 set [name] = @name, email = @email, avatarUrl = @avatarUrl , LastUpdated = GETDATE()  WHERE TenantId = @TenantId AND Org = @org AND [login] = @login
	END
	 ELSE  
		BEGIN
		Insert into Developers
			(TenantId,Org, email, [name], [login], avatarUrl , lastUpdated)
		Values
			(@TenantId, @Org, @email, @name, @login, @avatarUrl, GETDATE());
	END






END
GO
/****** Object:  StoredProcedure [dbo].[SavePR4Repo]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[SavePR4Repo]
	(
	@Id VARCHAR(200),
	@Org VARCHAR(200),
	@Repo VARCHAR(200),
	@Url VARCHAR(2000),
	@State VARCHAR(50),
	@Title VARCHAR(2000),
	@Created_At VARCHAR(20),
	@body VARCHAR(2000),
	@Login VARCHAR(100),
	@Avatar_url VARCHAR(2000),
	@User_url VARCHAR(2000)

)
AS
BEGIN


	IF EXISTS ( SELECT *
	FROM [dbo].[PullRequestDetails]
	WHERE Id = @Id AND [State] = @state)   
			BEGIN
		UPDATE [PullRequestDetails]  
					SET LastUpdated = getDate(),
						Created_At =  CAST(@Created_At as DATETIME),
						Org = @Org,
						Repo = @Repo,
						[url] = @Url,
						[State] = @State,
						Title = @Title,
						Body = @Body,
						[Login] = @Login,
						Avatar_Url = @Avatar_url,
						User_Url = @User_Url 
								WHERE Id = @Id
	END
		ELSE
			BEGIN
		INSERT INTO [PullRequestDetails]
			(
			Id,
			Org ,
			Repo,
			[Url] ,
			[State],
			Title ,
			Created_At ,
			body ,
			[Login],
			Avatar_url ,
			User_url
			)
		VALUES
			(
				@Id,
				@Org ,
				@Repo,
				@Url ,
				@State,
				@Title ,
				CAST(@Created_At as DATETIME) ,
				@body ,
				@Login,
				@Avatar_url ,
				@User_url 
			)
	END

END
GO
/****** Object:  StoredProcedure [dbo].[SetOrg]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Rafat Sarosh
-- Create Date: 1/5/2019
-- Description:  
-- =============================================
CREATE PROCEDURE [dbo].[SaveOrg]
	(
	-- Add the parameters for the stored procedure here
	@TenantId INT,
	@Org VARCHAR(200)
)
AS
BEGIN

	IF NOT EXISTS ( SELECT *
	FROM [dbo].[TenantOrg]
	WHERE TenantId = @TenantId AND Org = @org)   
		BEGIN
		Insert into TenantOrg
			(TenantId,Org)
		Values
			(@TenantId, @Org);
	END





END
GO
/****** Object:  StoredProcedure [dbo].[SetRepoCollection]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Rafat Sarosh
-- Create Date: 1/5/2019
-- Description:  
-- =============================================
CREATE PROCEDURE [dbo].[SetRepoCollection]
	(
	@TenantId VARCHAR (50),
	@Org VARCHAR (200),
	@Repos VARCHAR (200),
	@CollectionName VARCHAR (200)
)
AS
DECLARE @Repo VARCHAR (200)

CREATE TABLE #T1
(
	val VARCHAR(200),
)
INSERT INTO #t1
SELECT VALUE
FROM STRING_SPLIT (@Repos, ',')

DECLARE RepoCur CURSOR READ_ONLY
      FOR
      SELECT val
FROM #T1

OPEN RepoCur

FETCH NEXT FROM RepoCur INTO @Repo

WHILE @@FETCH_STATUS = 0
	BEGIN
		IF NOT EXISTS ( SELECT *
		FROM RepoCollections
		WHERE TenantId = @TenantId AND ORG = @Org AND CollectionName = @CollectionName AND Repo = @Repo)
				BEGIN
			INSERT INTO RepoCollections
				([TenantId],[Org],[Repo],[CollectionName])
			VALUES
				(@TenantId, @Org, @Repo, @CollectionName)
	END
	FETCH NEXT FROM RepoCur INTO @Repo
END
GO
/****** Object:  StoredProcedure [dbo].[SetRepos]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[SaveRepos]
	(
	@TenantId VARCHAR(50),
	@Org VARCHAR(200),
	@Id VARCHAR(100),
	@name VARCHAR(200),
	@desc VARCHAR(1000),
	@HomePage VARCHAR(1000),
	@CreatedAt VARCHAR(10)

)
AS
BEGIN

	/*	DECLARE @ID VARCHAR(100)
	DECLARE @Name VARCHAR(200)
	DECLARE @Desc VARCHAR(1000)
	DECLARE @HomePage VARCHAR(1000)
	DECLARE @CreatedAt DateTime

	CREATE TABLE #T1 (
		id VARCHAR(100),
		[name] VARCHAR(200),
		[desc] VARCHAR(1000),
		HomePage VARCHAR(1000),
		CreatedAt VARCHAR(12),

	)
	INSERT INTO #t1  SELECT VALUE FROM  STRING_SPLIT (@Repository, ',')  
		
	DECLARE RepoCur CURSOR READ_ONLY
      FOR
      SELECT * FROM #T1
	OPEN RepoCur
	FETCH NEXT FROM RepoCur INTO @ID, @Name, @Desc, @HomePage, @CreatedAt

	WHILE @@FETCH_STATUS = 0
	BEGIN
	*/
	IF EXISTS ( SELECT *
		FROM TenantRepos
		WHERE TenantId = @TenantId AND ID = @ID AND Org = @Org)   
		UPDATE TenantRepos  
				SET LastRefereshed = getDate(),
						RepoName = @Name,
						ID = @ID,
						[Desc] = @Desc,
						HomePage = @HomePage,
						Created_At =  CAST (@CreatedAt as DATETIME)
						WHERE TenantId = @TenantId AND RepoName = @Name AND Org = @Org
	ELSE

		INSERT INTO TenantRepos
		(TenantId,RepoName, Org, ID, [Desc], HomePage, Created_At)
	VALUES
		(@TenantId, @Name, @Org, @ID, @Desc, @HomePage, CAST(@CreatedAt as DateTime));

/*	FETCH NEXT FROM RepoCur INTO @ID, @Name, @Desc, @HomePage, @CreatedAt
	END
	CLOSE RepoCur
	DEALLOCATE RepoCur
	*/
END
GO
/****** Object:  StoredProcedure [dbo].[SetTenant]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Rafat Sarosh
-- Create Date: 1/5/2019
-- Description:  
-- =============================================
CREATE PROCEDURE [dbo].[SaveTenant]
	(
	-- Add the parameters for the stored procedure here
	@Id INT,
	@email VARCHAR (200),
	@UserName VARCHAR(200),
	@DisplayName VARCHAR(200),
	@ProfileUrl VARCHAR(2000),
	@AuthToken VARCHAR(4000),
	@RefreshToken VARCHAR(4000),
	@Photo VARCHAR(2000)
)
AS
BEGIN

	IF EXISTS ( SELECT *
	FROM Tenant
	WHERE Id = @Id)   
		Update Tenant Set Auth_Token = @AuthToken, 
						  Email = @email,
						  Refresh_Token = @RefreshToken ,
						  UserName = @UserName,
						  DisplayName = @DisplayName,
						  ProfileUrl = @ProfileUrl,
						  LastUpdated = GETDATE(),
						  Photo = @Photo
							where Id = @Id
	Else
		Insert into Tenant
		(Id, email, UserName, DisplayName, ProfileUrl, Photo, Auth_Token, Refresh_token, LastUpdated)
	Values
		(@Id, @email, @UserName, @DisplayName, @ProfileUrl, @Photo, @AuthToken, @RefreshToken, GETDATE());
END
GO
/****** Object:  StoredProcedure [dbo].[TopDevForLastXDays]    Script Date: 6/1/2019 5:21:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Rafat Sarosh
-- Create Date: 1/5/2019
-- Description:  
-- =============================================
CREATE PROCEDURE [dbo].[TopDevForLastXDays]
	(
	-- Add the parameters for the stored procedure here
	@Day int = 1,
	@Org VARCHAR(200)
)
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON

	SELECT login, Avatar_Url, count(*) as ctr
	FROM [vwOpenClosedPR]
	WHERE 
	Created_At BETWEEN  CAST( CAST(GETDATE() - @Day  as char(12)) AS DateTime) AND  CAST( CAST (GETDATE()  as char(12)) as DateTime)
		AND Org = @Org
		AND (State = 'opened' OR State = 'open' OR State = 'closed' OR State = 'close' OR State = 'commit')
	GROUP BY  login, Avatar_Url
	ORDER BY   ctr desc

END
GO

/****** Object:  StoredProcedure [dbo].[GetOrg]    Script Date: 6/1/2019 9:28:23 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Rafat Sarosh
-- Create Date: 1/5/2019
-- Description:  
-- =============================================
Create PROCEDURE [dbo].[GetDevs]
	(
	-- Add the parameters for the stored procedure here
	@TenantId INT,
	@org VARCHAR(50)
	
)
AS
BEGIN

	SELECT *
	FROM [dbo].[TenantOrg]
	WHERE TenantId = @TenantId and Org = @Org


END


ALTER DATABASE [git] SET  READ_WRITE 
GO
