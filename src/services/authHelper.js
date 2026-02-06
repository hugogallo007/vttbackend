import { DefaultAzureCredential } from "@azure/identity";

export const getDataverseToken = async () => {
  // En App Service, DefaultAzureCredential usará la Managed Identity automáticamente
  const credential = new DefaultAzureCredential();

  // Importante: scope = URL del entorno Dataverse + "/.default"
  // Ej: https://tuorg.crm.dynamics.com/.default
  const scope = `${process.env.WEB_API}/.default`;

  const accessToken = await credential.getToken(scope);

  if (!accessToken?.token)
    throw new Error("No se pudo obtener access token con Managed Identity.");
  return accessToken.token;
};
