using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace BusTrackerApi.Hubs
{
    public class TrackingHub : Hub
    {
        public async Task JoinTripGroup(string tripId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Trip_{tripId}");
        }

        public async Task LeaveTripGroup(string tripId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Trip_{tripId}");
        }

        public async Task SendLocationUpdate(string tripId, double latitude, double longitude, string status)
        {
            await Clients.Group($"Trip_{tripId}").SendAsync("ReceiveLocationUpdate", new
            {
                TripId = tripId,
                Latitude = latitude,
                Longitude = longitude,
                Status = status
            });
        }
    }
}
