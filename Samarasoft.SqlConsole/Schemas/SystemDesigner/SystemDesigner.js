define("SystemDesigner", ["SystemDesignerResources", "RightUtilities"],
	function(resources, RightUtilities) {
	return {
		attributes: {
			"CanUseSqlConsole": {dataValueType: Terrasoft.DataValueType.BOOLEAN}
		},
		methods: {
			/**
			 * Инициализует модель представления.
			 * @protected
			 * @overridden
			 * @param {Function} callback Функция обратного выхова.
			 * @param {Object} scope Объект окружения фукнции обратного вызова.
			 */
			init: function(callback, scope) {
				this.callParent([function() {
					this.initCanUseSqlConsoleOperationRights(function() {
						if (callback) {
							callback.call(scope);
						}
					}, this);
				}, this]);
			},
			/**
			 * Возвращает объект развязки операций и названия прав.
			 * @protected
			 * @virtual
			 * @return {Object} Объект развязки.
			 */
			getCanUseSqlConsoleOperationRightsDecoupling: function() {
				return {
					"navigateToSqlConsoleModuleClick": "CanUseSqlConsole"
				};
			},
			/**
			 * Инициализирует доступ текущего пользователя на все успользуемые операции.
			 * @protected
			 * @virtual
			 * @param {Function} callback Функция обратного выхова.
			 * @param {Object} scope Объект окружения фунrции обратного вызова.
			 */
			initCanUseSqlConsoleOperationRights: function(callback, scope) {
				var getCanUseSqlConsoleOperationRightsDecoupling = this.getCanUseSqlConsoleOperationRightsDecoupling();
				var operationRightsNames = Ext.Object.getValues(getCanUseSqlConsoleOperationRightsDecoupling);
				var uniqueOperationNames = [];
				Terrasoft.each(operationRightsNames, function(operationName) {
					if (uniqueOperationNames.indexOf(operationName) < 0) {
						uniqueOperationNames.push(operationName);
					}
				}, this);
				RightUtilities.checkCanExecuteOperations(uniqueOperationNames, function(result) {
					Terrasoft.each(result, function(operationRight, operationName) {
						this.set(operationName, operationRight);
					}, this);
					if (callback) {
						callback.call(scope);
					}
				}, this);
			},
			/**
			 * Инициализирает права доступа к Консоли SQL запросов
			 * @private
			 */
			onNavigateToSqlConsoleModuleClick: function() {
				if (this.get("CanUseSqlConsole") != null) {
					this.navigateToSqlConsoleModule();
				} else {
					RightUtilities.checkCanExecuteOperation({
						operation: "CanUseSqlConsole"
					}, function(result) {
						this.set("CanUseSqlConsole", result);
						this.navigateToSqlConsoleModule();
					}, this);
				}
				return false;
			},
			/**
			 * Открывает Консоль SQL запросов или показывает сообщение о ошибке.
			 * @private
			 */
			navigateToSqlConsoleModule: function() {
				if (this.get("CanUseSqlConsole") === true) {
					this.sandbox.requireModuleDescriptors(["SqlConsoleModule"], function() {
						this.sandbox.publish("PushHistoryState", {hash: "SqlConsoleModule"});
					}, this);
				} else {
					var message = this.get("Resources.Strings.RightsErrorMessage");
					this.Terrasoft.utils.showInformation(message);
					this.hideBodyMask();
				}
			}
		},
		diff: [
			{
				"operation": "insert",
				"propertyName": "items",
				"parentName": "ConfigurationTile",
				"name": "SqlConsoleLink",
				"values": {
					"itemType": Terrasoft.ViewItemType.LINK,
					"caption": {"bindTo": "Resources.Strings.SqlConsoleCaption"},
					"click": {"bindTo": "onNavigateToSqlConsoleModuleClick"}
				}
			}
		]
	};
});