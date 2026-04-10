import * as signalR from "@microsoft/signalr";

export function createPollHubConnection() {
  return new signalR.HubConnectionBuilder()
    .withUrl("http://localhost:5001/hubs/polls", {
      withCredentials: true,
    })
    .withAutomaticReconnect()
    .build();
}
