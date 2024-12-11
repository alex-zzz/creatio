namespace Terrasoft.Configuration.SqlConsoleService
{
	using System.CodeDom.Compiler;
	using System.ServiceModel;
	using System.ServiceModel.Web;
	using System.ServiceModel.Activation;
	using System.Runtime.Serialization;
	using System.Web;
	using Terrasoft.Common;
	using Terrasoft.Core;
	using Terrasoft.Core.DB;
	using Terrasoft.Core.Entities;
	using Terrasoft.Core.Store;
	using System;
	using System.Data;
	using System.Collections.Generic;
	using System.Linq;
	using System.Text;
	using Newtonsoft.Json.Linq;

	[ServiceContract]
	[AspNetCompatibilityRequirements(RequirementsMode = AspNetCompatibilityRequirementsMode.Required)]
	public class SqlConsoleService {
		[OperationContract]
		[WebInvoke(Method = "POST", UriTemplate = "ExecuteSqlScript", BodyStyle = WebMessageBodyStyle.Wrapped,
			RequestFormat = WebMessageFormat.Json, ResponseFormat = WebMessageFormat.Json)]
		public ExecuteSqlResult ExecuteSqlScript(string sqlScript) {
			ExecuteSqlResult result = ExecuteSqlScript(sqlScript, true);
			return result;
		}
		
		[OperationContract]
		[WebInvoke(Method = "POST", UriTemplate = "GetSqlConsoleLog", BodyStyle = WebMessageBodyStyle.Wrapped,
			RequestFormat = WebMessageFormat.Json, ResponseFormat = WebMessageFormat.Json)]
		public ExecuteSqlResult GetSqlConsoleLog() {
			string sqlScript = "SELECT TOP (1000) [CreatedOn], [ContactId], [IpAdress], [QueryText], [CompletedOn] FROM [SqlConsoleLog] ORDER BY [CreatedOn] DESC";
			ExecuteSqlResult result = ExecuteSqlScript(sqlScript, false);
			return result;
		}
		
		private ExecuteSqlResult ExecuteSqlScript(string sqlScript, bool logging) {
			ExecuteSqlResult result = new ExecuteSqlResult();
			UserConnection userConnection = null;
			
			try {
				userConnection = (UserConnection)HttpContext.Current.Session["UserConnection"];
				userConnection.DBSecurityEngine.CheckCanExecuteOperation("CanUseSqlConsole");
			} catch (System.Security.SecurityException exc) {
				result.SecurityError = true;
				return result;
			}
			
			List<QueryResult> queryResults = new List<QueryResult>();
			int rowsAffected = 0;
			
			try {
				var resultQuery = new CustomQuery(userConnection, sqlScript);
				
				Guid logRecordId = Guid.NewGuid();
				if (logging) 
				{
					LogQuery(sqlScript, logRecordId, userConnection);
				}
				using (DBExecutor dbExecutor = userConnection.EnsureDBConnection()) {
					using(var dr = resultQuery.ExecuteReader(dbExecutor)) {
						DataTable dataTable;
						while (true) {
							var queryResult = new QueryResult();
							dataTable = new DataTable();
							dataTable.Load(dr);
							
							queryResult.Columns = new List<string>();
							queryResult.Columns.AddRange(dataTable.Columns.Cast<DataColumn>().Select(column => column.ColumnName));
							
							if (queryResult.Columns.Count == 0) {
								rowsAffected = (dr.RecordsAffected > 0) ? dr.RecordsAffected : 0;
								break;
							}
							
							queryResult.Rows = new List<List<string>>();
							foreach (DataRow row in dataTable.Rows)
							{
								var r = new List<string>();
								r.AddRange(row.ItemArray.Select(field => (field == DBNull.Value) ? "NULL" : field.ToString()));
								queryResult.Rows.Add(r);
							}
							queryResults.Add(queryResult);
						}
						if (logging) 
						{
							UpdateLogQuery(logRecordId, userConnection);
						}
					}
				}
			} catch (System.Data.SqlClient.SqlException exc) {
				if (exc.Errors != null) {
					StringBuilder sb = new StringBuilder();
					for (var i = 0; i < exc.Errors.Count; i++) {
						var sqlError = exc.Errors[i];
						sb.AppendLine(String.Format("Msg {0}, Level {1}, State {2}, Line {3}\n{4}", sqlError.Number, sqlError.Class, sqlError.State, sqlError.LineNumber, sqlError.Message));
					}
					result.ErrorMessage = sb.ToString();
					return result;
				} else {
					result.ErrorMessage = exc.ToString();
					return result;
				}
			} catch (Exception exc) {
				result.ErrorMessage = exc.ToString();
				return result;
			}
			
			result.QueryResults = queryResults;
			result.RowsAffected = rowsAffected;
			result.Success = true;
			return result;
		}
		
		private void LogQuery(string text, Guid logRecordId, UserConnection userConnection) {
			var insert = new Insert(userConnection).Into("SqlConsoleLog")
				.Set("Id", Column.Parameter(logRecordId))
				.Set("CreatedOn", Column.Parameter(DateTime.UtcNow))
				.Set("ModifiedOn", Column.Parameter(DateTime.UtcNow))
				.Set("ContactId", Column.Parameter(userConnection.CurrentUser.ContactId))
				.Set("IpAdress", Column.Parameter(userConnection.CurrentUser.ClientIP))
				.Set("QueryText", Column.Parameter(text));
			insert.Execute();
		}
		
		private void UpdateLogQuery(Guid logRecordId, UserConnection userConnection) {
			Update update = new Update(userConnection, "SqlConsoleLog");
				update.Set("CompletedOn", Column.Parameter(DateTime.UtcNow));
				update.Where("Id").IsEqual(Column.Parameter(logRecordId));
			update.Execute();
		}
		
		[DataContract(Namespace = "http://Terrasoft.WebApp.Service/")]
		public class QueryResult
		{
			[DataMember]
			public List<string> Columns {
				get;
				set;
			}

			[DataMember]
			public List<List<string>> Rows {
				get;
				set;
			}
		}
		
		[DataContract(Namespace = "http://Terrasoft.WebApp.Service/")]
		public class ExecuteSqlResult
		{
			[DataMember]
			public List<QueryResult> QueryResults {
				get;
				set;
			}

			[DataMember]
			public int RowsAffected {
				get;
				set;
			}
			
			[DataMember]
			public string ErrorMessage {
				get;
				set;
			}
			
			[DataMember]
			public bool SecurityError {
				get;
				set;
			}
			
			[DataMember]
			public bool Success {
				get;
				set;
			}
		}
	}
}