using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BusTrackerApi.Data;
using System.Threading.Tasks;

namespace BusTrackerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RoutesController : BaseApiController
    {
        public RoutesController(AppDbContext context) : base(context) { }

        // GET: api/routes
        [HttpGet]
        public async Task<IActionResult> GetRoutes()
        {
            var routes = await _context.Routes.ToListAsync();
            return Ok(routes);
        }
    }
}
