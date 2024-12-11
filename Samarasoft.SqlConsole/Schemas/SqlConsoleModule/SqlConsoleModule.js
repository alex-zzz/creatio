/*global ace*/
define("SqlConsoleModule", ["SqlConsoleModuleResources", "JQueryDataTables", "AceCodeEditor", "SecurityUtilities", "css!JQueryDataTables", "DOMPurify"],
	function (resources) {

		/**
		 * Метод очистки результатов запроса
		 */

		var clearQueryResult = function () {
			var i = 0;
			while ($("#query-result-table" + i).length != 0) {
				$("#query-result-table" + i).DataTable().destroy();
				$("#query-result-table" + i).remove();
				i++;
			}
			$("#query-result-text").remove();
		}

		/**
		 * Выполняет вызов метода сервиса
		 * @param methodName Название метода
		 * @param data
		 * @param callback Функция-callback
		 */
		var callServiceMethod = function (methodName, data, callback) {
			Terrasoft.AjaxProvider.request({
				url: Terrasoft.workspaceBaseUrl + "/rest/SqlConsoleService/" + methodName,
				headers: {
					"Accept": "application/json",
					"Content-Type": "application/json"
				},
				method: "POST",
				jsonData: data || {},
				callback: function (request, success, response) {
					var responseObject = {};
					if (success) {
						var obj = Terrasoft.decode(response.responseText);
						responseObject = obj[methodName + "Result"];
						callback.call(this, responseObject);
					} else {
						clearQueryResult();
						switch (Terrasoft.SysValue.CURRENT_USER_CULTURE.value) {
							case "a5420246-0a8e-e111-84a3-00155d054c03":
								this.Terrasoft.utils.showInformation("An error occurred while querying!", null, this);
								break;
							case "1a778e3f-0a8e-e111-84a3-00155d054c03":
								this.Terrasoft.utils.showInformation("При выполнении запроса произошла ошибка!", null, this);
							default:
							// code
						}
					}
				},
				scope: this
			});
		};

		/**
		 * Выводит результат выполнения запроса на страницу в компонент-таблицу JQueryTablesorter
		 * @param result
		 */
		var showQueryResult = function (result, scope) {
			// use DOMPurify to sanitize result
			// TODO: result.QueryResults.Rows.forEach(r => r = DOMPurify.sanitize(r.value) );
			clearQueryResult();
			if (result.Success) {
				if (result.QueryResults) {
					for (var i = 0; i < result.QueryResults.length; i++) {
						$("#sqlconsole-module-panel").append('<table id="query-result-table' + i + '" class="display" width="100%"></table>');
						var columns = formDataTableColumns(result.QueryResults[i].Columns);
						var dataSet = result.QueryResults[i].Rows;
						$("#query-result-table" + i).DataTable({
							scrollY: "auto",
							scrollX: true,
							scrollCollapse: false,
							language: {
								//	"decimal": "",
								"emptyTable": scope.get("Resources.Strings.DataTableEmptyTable"),//"No data available in table",
								"info": scope.get("Resources.Strings.DataTableInfo"),//"Showing _START_ to _END_ of _TOTAL_ entries",
								"infoEmpty": scope.get("Resources.Strings.DataTableInfoEmpty"),//"Showing 0 to 0 of 0 entries",
								"infoFiltered": scope.get("Resources.Strings.DataTableInfoFiltered"),//"(filtered from _MAX_ total entries)",
								//	"infoPostFix": "",
								//	"thousands": ",",
								"lengthMenu": scope.get("Resources.Strings.DataTableLengthMenu"),//"Show _MENU_ entries",
								"loadingRecords": scope.get("Resources.Strings.DataTableLoadingRecords"),//"Loading...",
								"processing": scope.get("Resources.Strings.DataTableProcessing"),//"Processing...",
								"search": scope.get("Resources.Strings.DataTableSearch"),//"Search:",
								"zeroRecords": scope.get("Resources.Strings.DataTableZeroRecords"),//"No matching records found",
								"paginate": {
									//	"first": "First",
									//	"last": "Last",
									"next": scope.get("Resources.Strings.DataTablePaginateNext"),//"Next",
									"previous": scope.get("Resources.Strings.DataTablePaginatePrevious")//"Previous"
								},
								//"aria": {
								//	"sortAscending":  ": activate to sort column ascending",
								//	"sortDescending": ": activate to sort column descending"
								//}
							},
							data: dataSet,
							columns: columns
						});
					}
				}
				window.$("#sqlconsole-module-panel-rowsaffected-container").html(result.RowsAffected + " row(s) affected");
			}
			else {
				if (result.SecurityError) {
					$("#sqlconsole-module-panel").append('<div id="query-result-text" width="100%"><font size="3" color="red" face="Consolas">' + scope.get("Resources.Strings.AccessError") + '</font></div>');
				} else {
					var htmlErrorMessage = formHtmlErrorMessage(result.ErrorMessage);
					$("#sqlconsole-module-panel").append('<div id="query-result-text" width="100%"><font size="3" color="red" face="Consolas">' + htmlErrorMessage + '</font></div>');
				}
			}
			var editor = ace.edit("editor");
			editor.focus();
		};

		var formHtmlErrorMessage = function (data) {
			var lines = data.split('\n');
			var htmlLines = "";
			for (i = 0; i < lines.length; i++) {
				htmlLines += lines[i] + '<br>';
			}
			return htmlLines;
		};

		var formDataTableColumns = function (data) {
			var result = [];
			for (var i = 0; i < data.length; i++) {
				result.push({ title: data[i] });
			}
			return result;
		};

		return Ext.define("Terrasoft.configuration.SqlConsoleModule", {
			extend: "Terrasoft.BaseModule",
			alternateClassName: "Terrasoft.SqlConsoleModule",
			mixins: {
				SecurityUtilitiesMixin: "Terrasoft.SecurityUtilitiesMixin"
			},
			Ext: null,
			sandbox: null,
			Terrasoft: null,
			isAsync: true,

			/**
			 * Инициализирует модуль.
			 * @param callback Функция, которая будет вызвана после инициализации модуля.
			 * @param scope Область видимости.
			 */
			init: function (callback, scope) {
				this.callParent(arguments);
				this.initDataTables();
				//this.checkAvailability(function() {
				var localizableStrings = resources.localizableStrings;
				var headerCaption = localizableStrings.HeaderCaption;
				this.sandbox.publish("ChangeHeaderCaption", {
					isMainMenu: false,
					caption: headerCaption,
					dataViews: this.Ext.create("Terrasoft.Collection")
				});
				this.sandbox.subscribe("NeedHeaderCaption", function () {
					this.sandbox.publish("InitDataViews", {
						isMainMenu: false,
						caption: headerCaption,
						dataViews: this.Ext.create("Terrasoft.Collection")
					});
				}, this);
				this.initHistoryState();
				this.initViewModel({
					callback: callback,
					scope: scope
				});
				//});
			},

			//Добавлено из-за проблем с кэшированием jQuery при переходе из другого раздела.
			initDataTables: function () {
				var dataTables = require('JQueryDataTables');
				$ = dataTables.$;
			},

			/**
			 * Инициализирует ViewModel
			 * @param options
			 */
			initViewModel: function (options) {
				var callback = options.callback;
				var scope = options.scope;
				var values = {
					IsExportToCsvVisible: false,
					QueryResults: {},
					QueryTime: 0,
					QueryTimeLabelCaption: "",
					QueryTimerId: 0
				};
				var columns = {
					IsExportToCsvVisible: { dataValueType: Terrasoft.DataValueType.BOOLEAN },
					QueryResults: { dataValueType: Terrasoft.DataValueType.COLLECTION },
					QueryTime: { dataValueType: Terrasoft.DataValueType.INTEGER },
					QueryTimeLabelCaption: { dataValueType: Terrasoft.DataValueType.TEXT },
					QueryTimerId: { dataValueType: Terrasoft.DataValueType.INTEGER }
				};
				this.viewModel = this.createViewModel({
					values: values,
					columns: columns
				});
				this.initResources(this.viewModel, resources);
				if (callback) {
					callback.call(scope);
				}
			},

			initResources: function (scope, resources) {
				resources = resources || {};
				Terrasoft.each(resources.localizableStrings, function (value, key) {
					scope.set("Resources.Strings." + key, value);
				}, scope);
				Terrasoft.each(resources.localizableImages, function (value, key) {
					scope.set("Resources.Images." + key, value);
				}, scope);
			},

			/**
			 * Создает ViewModel
			 * @param options
			 * @returns {Terrasoft.BaseViewModel}
			 */
			createViewModel: function (options) {
				var Terrasoft = this.Terrasoft;
				var sandbox = this.sandbox;
				var columns = options.columns;
				columns.hasChanges = {
					dataValueType: Terrasoft.DataValueType.BOOLEAN,
					isRequired: false
				};
				var values = options.values;
				values.hasChanges = false;
				return this.Ext.create("Terrasoft.BaseViewModel", {
					columns: columns,
					values: values,
					methods: {
						/**
						 * Обрабатывает нажатие на кнопку "Найти"
						 */
						onExecute: function () {
							var sqlScript = this.getSqlScript(true);
							if (!sqlScript) {
								return this.onClear();
							}
							var scope = this;
							this.clearQueryTimer(this);
							this.setAttributesToDefaultValues(this);
							this.setQueryTimeLabelCaption(this);
							var queryTimerId = setInterval(this.setQueryTimeLabelCaption, 1000, this);
							this.set("QueryTimerId", queryTimerId);
							var data = { sqlScript: sqlScript };
							callServiceMethod("ExecuteSqlScript", data, function (result) {
								scope.sanitizeResult(result);
								if (result.Success && result.QueryResults.length != 0) {
									//scope.sanitizeQueryResults(result.QueryResults);
									scope.set("IsExportToCsvVisible", true);
									scope.set("QueryResults", result.QueryResults);
								}
								showQueryResult(result, scope);
								scope.clearQueryTimer(scope);
							});
						},
						/**
						 * Обрабатывает нажатие на кнопку "Закрыть"
						 */
						onClose: function () {
							sandbox.publish("BackHistoryState");
						},
						/**
						 * Обрабатывает нажатие на кнопку "Очистить"
						 */
						onClear: function () {
							clearQueryResult();
							this.clearQueryTimer(this);
							this.setAttributesToDefaultValues(this);
							var editor = this.getEditor();
							editor.setValue("");
							editor.focus();
						},
						onGetSqlConsoleLog: function () {
							var scope = this;
							this.clearQueryTimer(this);
							this.setAttributesToDefaultValues(this);
							this.setQueryTimeLabelCaption(this);
							var queryTimerId = setInterval(this.setQueryTimeLabelCaption, 1000, this);
							this.set("QueryTimerId", queryTimerId);
							var data = { sqlScript: this.getSqlScript() };
							callServiceMethod("GetSqlConsoleLog", data, function (result) {
								scope.sanitizeResult(result);
								if (result.Success && result.QueryResults.length != 0) {
									scope.set("IsExportToCsvVisible", true);
									scope.set("QueryResults", result.QueryResults);
								}
								showQueryResult(result, scope);
								scope.clearQueryTimer(scope);
							});
						},
						onExportToCsv: function () {
							var scope = this;
							Terrasoft.SysSettings.querySysSettingsItem("CSVDelimiter",
								function (value) {
									var csvDelimiter = value;
									var csvData = "\uFEFF";

									var queryResults = this.get("QueryResults");
									for (var p = 0; p < queryResults.length; p++) {
										var selectedColumns = queryResults[p].Columns;
										for (var i = 0; i < selectedColumns.length; i++) {
											csvData += selectedColumns[i];
											if (i != selectedColumns.length - 1) {
												csvData += csvDelimiter;
											}
										}
										csvData += "\n";
										var selectedRows = queryResults[p].Rows;
										for (var i = 0; i < selectedRows.length; i++) {
											for (var j = 0; j < selectedRows[i].length; j++) {
												csvData += selectedRows[i][j].replace(/\n/g, " "); // Для поддержки многострочного текста
												if (j != (selectedRows[i].length - 1)) {
													csvData += csvDelimiter;
												}
											}
											if (i != (selectedRows.length - 1)) {
												csvData += "\n";
											}
										}
										if (p != (queryResults.length - 1)) {
											csvData += "\n";
										}
									}

									var blob = new Blob([csvData], {
										type: "application/csv;charset=utf-8;"
									});
									var csvFile = document.createElement("a");
									csvFile.href = URL.createObjectURL(blob);
									csvFile.download = "Select.csv";
									document.body.appendChild(csvFile);
									csvFile.click();
									document.body.removeChild(csvFile);
								},
								this);
						},
						setQueryTimeLabelCaption: function (scope) {
							var queryTime = scope.get("QueryTime");
							var queryTimeLabelCaption = scope.get("Resources.Strings.QueryTimeLabelCaptionPrefix") + queryTime + scope.get("Resources.Strings.QueryTimeLabelCaptionPostfix");
							scope.set("QueryTimeLabelCaption", queryTimeLabelCaption);
							scope.set("QueryTime", queryTime + 1);
						},
						setAttributesToDefaultValues: function (scope) {
							scope.set("IsExportToCsvVisible", false);
							scope.set("QueryTime", 0);
							scope.set("QueryTimeLabelCaption", "");
							scope.set("QueryTime", 0);
							scope.set("QueryResults", {});
						},
						clearQueryTimer: function (scope) {
							var queryTimerId = scope.get("QueryTimerId");
							if (queryTimerId) {
								clearInterval(queryTimerId);
							};
						},
						init: function () {
							var sqlScript = this.getLocalStore().getItem("SqlConsoleLastScript") || "";
							if (sqlScript.trim()) {
								this.getEditor().setValue(sqlScript);
							}
							this.addHotkeys();
							Ext.EventManager.on(window, "beforeunload", this.onBeforeUnload, this);
						},
						addHotkeys: function () {
							var doc = Ext.getDoc();
							doc.on("keydown", this.onKeyDown, this);
							var editor = this.getEditor();
							editor.commands.removeCommand('gotoline');
						},
						removeHotkeys: function () {
							var doc = Ext.getDoc();
							doc.un("keydown", this.onKeyDown, this);
						},
						onKeyDown: function (e) {
							if (e.keyCode === e.ENTER && e.ctrlKey && !e.shiftKey && !e.altKey) {
								e.preventDefault();
								this.onExecute();
								return false;
							}
							if (e.keyCode === e.L && e.ctrlKey && !e.shiftKey && !e.altKey) {
								e.preventDefault();
								this.onClear();
								return false;
							}
							if (e.keyCode === e.S && e.ctrlKey && !e.shiftKey && !e.altKey) {
								e.preventDefault();
								this.onSaveSql();
								return false;
							}
							if (e.keyCode === e.S && e.ctrlKey && e.shiftKey && !e.altKey) {
								e.preventDefault();
								this.onExportToCsv();
								return false;
							}
							if (e.keyCode === e.H && e.ctrlKey && e.shiftKey && !e.altKey) {
								e.preventDefault();
								this.onGetSqlConsoleLog();
								return false;
							}
						},
						onSaveSql: function () {
							var sqlScript = this.getSqlScript();
							if (!sqlScript) {
								return;
							}
							var link = document.createElement("a");
							document.body.appendChild(link);
							link.style = "display: none";
							var blob = new Blob([sqlScript], { type: "text/plain;charset=UTF-8" });
							var url = URL.createObjectURL(blob);
							link.href = url;
							var d = Ext.util.Format.date(new Date(), 'Ymd_Gis');
							link.download = Terrasoft.getFormattedString("script_{0}.sql", d);
							link.click();
							URL.revokeObjectURL(url);
							setTimeout(function () {
								document.body.removeChild(link);
							});
						},
						getEditor: function () {
							var id = "editor";
							return document.getElementById(id) ? ace.edit("editor") : null;
						},
						getSqlScript: function (onlySelected) {
							var editor = this.getEditor();
							var script = '';
							if (onlySelected) {
								script = editor.getSelectedText().trim();
							}
							return script || editor.getValue().trim();
						},
						getLocalStore: function () {
							if (!Terrasoft.DomainCache) {
								var domainCacheConfig = {
									levelName: "Domain",
									type: "Terrasoft.LocalStore",
									isCache: true
								};
								Terrasoft.StoreManager.registerStores([domainCacheConfig]);
							}
							return Terrasoft.DomainCache;
						},
						saveSqlScript: function () {
							this.getLocalStore().setItem("SqlConsoleLastScript", this.getSqlScript());
						},
						onBeforeUnload: function () {
							this.saveSqlScript();
						},
						onDestroy: function () {
							if (this.getEditor()) {
								this.saveSqlScript();
							}
							this.removeHotkeys();
							Ext.EventManager.un(window, "beforeunload", this.onBeforeUnload, this);
						},
						/**
						 * Performs sanitizing of the DB execution result.
						 * @param {*} result 
						 */
						sanitizeResult: function(result) {
							if (result.Success) {
								this.sanitizeQueryResults(result.QueryResults);
							}
							else {
								result.ErrorMessage = this.sanitizeString(result.ErrorMessage);
							}
						},
						/**
						 * Performs sanitizing of the whole QueryResults array.
						 * @param {QueryResults} queryResults db query result
						 */
						sanitizeQueryResults: function(queryResults) {
							Terrasoft.each(queryResults, function (queryResult) {
								this.sanitizeArray(queryResult.Columns);
								this.sanitizeRows(queryResult.Rows);
							}, this);	
						},
						/**
						 * Performs sanitizing of the QueryResults.Rows
						 * @param {string[][]} rows 
						 */
						sanitizeRows: function (rows) {
							Terrasoft.each(rows, function (row) {
								this.sanitizeArray(row);
							}, this);
						},
						/**
						 * Performs sanitizing of the single QueryResult.Row (by columns)
						 * @param {string[]} row 
						 */
						sanitizeArray: function (row) {
							for (var i = 0; i < row.length; i++) {
								row[i] = this.sanitizeString(row[i]);
							}
						},
						/**
						 * Sanitizes a single string
						 * @param {string} dirtyString string to sanitize
						 * @returns sanitized string
						 */
						sanitizeString: function(dirtyString) {
							return DOMPurify.sanitize(dirtyString);
						}
					}
				});
			},

			/**
			 * Генерирует представление модуля
			 * @returns {Terrasoft.GridLayout} Представление модуля.
			 */
			generateView: function () {
				var localizableStrings = resources.localizableStrings;
				var view = this.Ext.create("Terrasoft.GridLayout", {
					id: "sqlconsole-module-panel",
					items: [
						{
							item: Ext.create("Terrasoft.Container", {
								id: "sqlconsole-module-panel-buttons-container",
								items: [
									Ext.create("Terrasoft.Button", {
										caption: localizableStrings.ExecuteButton,
										style: Terrasoft.controls.ButtonEnums.style.GREEN,
										tips: [{ tip: { content: localizableStrings.ExecuteButtonTip } }],
										click: { bindTo: "onExecute" }
									}),
									Ext.create("Terrasoft.Button", {
										caption: localizableStrings.CloseButton,
										tips: [{ tip: { content: localizableStrings.CloseButtonTip } }],
										click: { bindTo: "onClose" }
									}),
									Ext.create("Terrasoft.Button", {
										caption: localizableStrings.ClearButton,
										tips: [{ tip: { content: localizableStrings.ClearButtonTip } }],
										click: { bindTo: "onClear" }
									}),
									Ext.create("Terrasoft.Button", {
										caption: localizableStrings.ShowQueryLogButton,
										tips: [{ tip: { content: localizableStrings.ShowQueryLogButtonTip } }],
										click: { bindTo: "onGetSqlConsoleLog" }
									}),
									Ext.create("Terrasoft.Button", {
										caption: localizableStrings.ExportToCsvButton,
										tips: [{ tip: { content: localizableStrings.ExportToCsvButtonTip } }],
										click: { bindTo: "onExportToCsv" },
										enabled: { bindTo: "IsExportToCsvVisible" }
									}),
									Ext.create("Terrasoft.Button", {
										caption: localizableStrings.SaveSqlButton,
										tips: [{ tip: { content: localizableStrings.SaveSqlButtonTip } }],
										click: { bindTo: "onSaveSql" }
									}),
									Ext.create("Terrasoft.Container", {
										id: "sqlconsole-module-panel-rowsaffected-container",
										items: []
									})
								]
							}),
							column: 0,
							row: 0,
							colSpan: 24,
							rowSpan: 1
						},
						{
							item: Ext.create("Terrasoft.Container", {
								id: "editor"
							}),
							column: 0,
							row: 1,
							colSpan: 24,
							rowSpan: 1
						},
						{
							item: Ext.create("Terrasoft.Container", {
								id: "query-time-container",
								items: [
									Ext.create("Terrasoft.Label", {
										caption: { bindTo: "QueryTimeLabelCaption" }
									})
								]
							}),
							column: 0,
							row: 2,
							colSpan: 24,
							rowSpan: 1
						}]
				});
				return view;
			},

			/**
			 * Запускает процесс рендеринга модуля.
			 */
			render: function (renderTo) {
				var view = this.generateView();
				view.bind(this.viewModel);
				view.render(renderTo);
				//MaskHelper.HideBodyMask();

				var editor = ace.edit("editor");
				editor.setTheme("ace/theme/sqlserver");
				editor.getSession().setMode("ace/mode/sqlserver");

				switch (Terrasoft.SysValue.CURRENT_USER_CULTURE.value) {
					case "a5420246-0a8e-e111-84a3-00155d054c03":
						editor.setValue(
							'--\n' +
							'-- SQL QUERY CONSOLE\n' +
							'--\n' +
							'-- This page allows to perform SQL queries and perform sampling from the database.\n' +
							'-- To execute the query, enter the query text in this field and execute the query,\n' +
							'-- by clicking on "Run" or the keyboard shortcut Ctrl + Enter.\n' +
							'-- When you run a SELECT statement, under this field will display the execution\n' +
							'-- results in the form of tables with sorting by columns.\n' +
							'-- When the INSERT, UPDATE, DELETE on a given field the number of entries that have\n' +
							'-- been added/modified/deleted by data operators (ROWS AFFECTED) will be displayed.\n' +
							'--\n');
						break;
					case "1a778e3f-0a8e-e111-84a3-00155d054c03":
						editor.setValue(
							'--\n' +
							'-- КОНСОЛЬ SQL ЗАПРОСОВ\n' +
							'--\n' +
							'-- Данная страница позволяет выполнять SQL запросы и выполнять выборки из базы данных.\n' +
							'-- Для выполнения запроса введите текст запроса в данное поле и выполните запрос,\n' +
							'-- нажав на "Выполнить", либо сочетанием клавиш Ctrl+Enter.\n' +
							'-- При выполнении оператора SELECT, под данным полем будут отображены результаты\n' +
							'-- выполнения в виде таблиц с возможностью сортировки по столбцам.\n' +
							'-- При выполнении операторов INSERT, UPDATE, DELETE над данным полем будет отображено\n' +
							'-- количество записей, добавленных/измененных/удаленных с помощью данных операторов (ROWS AFFECTED).\n' +
							'--\n');
					default:
					// code
				}
				editor.focus();
				this.viewModel.init();
			},

			/**
			 * Возвращает Название операции доступ на которую должен быть у пользователя для использования раздела или
			 * страницы
			 * @protected
			 * @virtual
			 * @return {String|null} Название операции.
			 */
			getSecurityOperationName: function () {
				return "CanUseSqlConsole";
			},

			/**
			 * Устанавливает результат проверки возможности выполнения администрируемой операции.
			 * @protected
			 * @virtual
			 * @param {String} operationName Имя администрируемой операции.
			 * @param {Boolean} result Результат проверки возможности выполнения администрируемой операции.
			 */
			setCanExecuteOperationResult: Terrasoft.emptyFn,

			/**
			 * Заменяет последний элемент в цепочке состояний, если его идентификатор модуля отличается от текущего
			 * @protected
			 * @virtual
			 */
			initHistoryState: function () {
				var sandbox = this.sandbox;
				var state = sandbox.publish("GetHistoryState");
				var currentHash = state.hash;
				var currentState = state.state || {};
				if (currentState.moduleId === sandbox.id) {
					return;
				}
				var newState = this.prepareHistorySate(currentState);
				sandbox.publish("ReplaceHistoryState", {
					stateObj: newState,
					pageTitle: null,
					hash: currentHash.historyState,
					silent: true
				});
			},

			/**
			 * Подготавливает новое состояние страницы
			 * @protected
			 * @virtual
			 * @return {Object} Возвращает новое состояние страницы
			 */
			prepareHistorySate: function (currentState) {
				var newState = this.Terrasoft.deepClone(currentState);
				newState.moduleId = this.sandbox.id;
				return newState;
			},

			/**
			 * Очищает все подписки на события и уничтожает объект.
			 * @overridden
			 * @param {Object} config Параметры уничтожения модуля
			 */
			destroy: function (config) {
				if (config.keepAlive !== true) {
					if (this.viewModel) {
						this.viewModel.destroy();
						this.viewModel = null;
					}
					this.callParent(arguments);
				}
			}
		});
	});
