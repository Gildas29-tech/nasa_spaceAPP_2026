import asyncio
from app.services.data_collection import collect_farm_data
from datetime import date

async def test():
    geometry = {
        'type': 'Polygon',
        'coordinates': [[
            [-93.5, 42.0], [-93.4, 42.0], [-93.4, 42.1], [-93.5, 42.1], [-93.5, 42.0]
        ]]
    }
    centroid = {'latitude': 42.05, 'longitude': -93.45}

    result = await collect_farm_data(
        collection_id='test-123',
        farm_id='farm-123',
        farm_name='Test Farm',
        geometry=geometry,
        start_date=date(2024, 6, 1),
        end_date=date(2024, 6, 15),
        centroid=centroid,
        crops_of_interest=['maize', 'soybean']
    )

    print('Collection ID:', result.collection_id)
    print('Farm ID:', result.farm_id)
    print('Summary:', result.to_dict()['summary'])

    for source_name, source_result in result.sources.items():
        print(f'  {source_name}: {source_result.status.value} - {source_result.error or "OK"}')

asyncio.run(test())