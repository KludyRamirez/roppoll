using Microsoft.AspNetCore.SignalR;

namespace RopPoll.Api.Hubs;

// A minimal hub — clients connect here to receive real-time poll updates.
// No methods need to be defined because the server pushes to clients,
// not the other way around.
public class PollHub : Hub { }
