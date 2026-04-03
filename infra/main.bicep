targetScope = 'subscription'

@description('Primary location for all resources')
param location string

@description('Environment name (used for resource naming)')
param environmentName string

@description('API key for protecting upload endpoints')
@secure()
param apiKey string

var abbrs = {
  resourceGroup: 'rg-'
  storageAccount: 'st'
  staticWebApp: 'swa-'
}

var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = {
  'azd-env-name': environmentName
}

resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: '${abbrs.resourceGroup}${environmentName}'
  location: location
  tags: tags
}

module storage 'modules/storage.bicep' = {
  name: 'storage'
  scope: rg
  params: {
    name: '${abbrs.storageAccount}${resourceToken}'
    location: location
    tags: tags
  }
}

module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'staticWebApp'
  scope: rg
  params: {
    name: '${abbrs.staticWebApp}${environmentName}'
    location: location
    tags: tags
    storageAccountName: storage.outputs.name
    storageAccountConnectionString: storage.outputs.connectionString
    apiKey: apiKey
  }
}

output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_STATIC_WEB_APP_NAME string = staticWebApp.outputs.name
output AZURE_STATIC_WEB_APP_URL string = staticWebApp.outputs.uri
output AZURE_STORAGE_ACCOUNT_NAME string = storage.outputs.name
