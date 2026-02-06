import { dataverseFetch } from "./dataverseClient.js";

export const getChangeHistory = async () => {
  try {
    const response = await dataverseFetch("/cr6c3_changehistories");
    if (!response.ok) {
      throw new Error(
        `Error en la solicitud a Dataverse: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(
      "Error al obtener el historial de cambios: " + error.message,
    );
  }
};

//todo problem country

export const getProblemCountries = async () => {
  try {
    const response = await dataverseFetch("/cr6c3_problemcountries");
    if (!response.ok) {
      throw new Error(
        `Error en la solicitud a Dataverse
: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(
      "Error al obtener los países con problemas: " + error.message,
    );
  }
};
