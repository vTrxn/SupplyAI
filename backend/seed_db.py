import os
import asyncio
from app.database import engine, Base, AsyncSessionLocal, create_tables
from app.models.user import Company, User
from app.models.inventory import Product, Inventory
from app.utils.jwt import hash_password
from sqlalchemy import select

async def seed():
    db_file = "./supplyai_dev.db"
    
    # 1. Borrar la base de datos si existe
    if os.path.exists(db_file):
        print(f"Borrando base de datos existente: {db_file}")
        try:
            os.remove(db_file)
            print("Base de datos borrada con éxito.")
        except Exception as e:
            print(f"No se pudo borrar la base de datos: {e}")

    # 2. Crear las tablas desde cero
    print("Creando tablas...")
    await create_tables()

    # 3. Insertar datos de prueba
    print("Insertando datos de prueba...")
    async with AsyncSessionLocal() as session:
        # 3.1 Insertar Empresa de desarrollo
        company = Company(
            id="dev-company-id",
            name="Distribuidora de Alimentos Bogotá S.A.S."
        )
        session.add(company)
        await session.flush()

        # 3.2 Insertar Usuario de desarrollo
        user = User(
            id="dev-user-id",
            company_id="dev-company-id",
            email="admin@supplyai.com",
            hashed_password=hash_password("supabase_auth_bypass"),
            full_name="Administrador de SupplyAI",
            is_active=True,
            is_verified=True
        )
        session.add(user)
        await session.flush()

        # 3.3 Insertar 30 productos con sus inventarios
        productos_data = [
            # Abarrotes
            {"sku": "ABR-ARR-001", "name": "Arroz Diana Vitamor 1kg", "category": "Abarrotes", "unit": "kg", "cost": 2500, "sale": 3200, "min": 50, "max": 500, "reorder": 100, "stock": 120, "loc": "Pasillo A-1"},
            {"sku": "ABR-ACE-002", "name": "Aceite Gourmet Frito Fácil 1L", "category": "Abarrotes", "unit": "litro", "cost": 9500, "sale": 12000, "min": 30, "max": 200, "reorder": 60, "stock": 85, "loc": "Pasillo A-2"},
            {"sku": "ABR-HAR-005", "name": "Harina de Trigo Haz de Oros 1kg", "category": "Abarrotes", "unit": "kg", "cost": 1800, "sale": 2500, "min": 30, "max": 250, "reorder": 50, "stock": 70, "loc": "Pasillo A-3"},
            {"sku": "ABR-AZU-006", "name": "Azúcar Manuelita Alta Pureza 1kg", "category": "Abarrotes", "unit": "kg", "cost": 2900, "sale": 3800, "min": 50, "max": 400, "reorder": 100, "stock": 110, "loc": "Pasillo A-4"},
            {"sku": "ABR-CAF-007", "name": "Café Sello Rojo Tradicional 500g", "category": "Abarrotes", "unit": "und", "cost": 8200, "sale": 11000, "min": 20, "max": 150, "reorder": 40, "stock": 35, "loc": "Pasillo A-5"},
            {"sku": "ABR-CHO-008", "name": "Chocolate de Mesa Sol 500g", "category": "Abarrotes", "unit": "und", "cost": 4800, "sale": 6500, "min": 20, "max": 150, "reorder": 40, "stock": 55, "loc": "Pasillo A-5"},
            {"sku": "ABR-ATU-012", "name": "Atún Van Camp's en Agua 160g", "category": "Abarrotes", "unit": "und", "cost": 5200, "sale": 7200, "min": 50, "max": 400, "reorder": 100, "stock": 140, "loc": "Pasillo C-1"},
            {"sku": "ABR-PAS-013", "name": "Pasta Doria Espagueti Clásico 500g", "category": "Abarrotes", "unit": "und", "cost": 1900, "sale": 2700, "min": 60, "max": 500, "reorder": 120, "stock": 210, "loc": "Pasillo C-2"},
            {"sku": "ABR-SAL-014", "name": "Sal Alta Pureza Refisal 1kg", "category": "Abarrotes", "unit": "kg", "cost": 900, "sale": 1500, "min": 30, "max": 300, "reorder": 60, "stock": 95, "loc": "Pasillo C-3"},
            {"sku": "ABR-SALS-015", "name": "Salsa de Tomate Fruco Doypack 400g", "category": "Abarrotes", "unit": "und", "cost": 3400, "sale": 4800, "min": 30, "max": 250, "reorder": 60, "stock": 72, "loc": "Pasillo C-4"},
            {"sku": "ABR-GAL-027", "name": "Galletas Festival Surtidas Taco x12", "category": "Abarrotes", "unit": "caja", "cost": 12000, "sale": 16500, "min": 15, "max": 100, "reorder": 30, "stock": 42, "loc": "Pasillo G-1"},
            {"sku": "ABR-PAP-028", "name": "Papas Margarita Sabor Pollo 110g", "category": "Abarrotes", "unit": "und", "cost": 2800, "sale": 3900, "min": 40, "max": 300, "reorder": 80, "stock": 98, "loc": "Pasillo G-2"},
            {"sku": "ABR-PAN-029", "name": "Pan Tajado Grande Bimbo", "category": "Abarrotes", "unit": "und", "cost": 4100, "sale": 5800, "min": 20, "max": 150, "reorder": 40, "stock": 18, "loc": "Pasillo G-3"},  # Stock bajo!
            {"sku": "ABR-HUE-030", "name": "Huevos Santa Anita Tipo AA x30", "category": "Abarrotes", "unit": "cartón", "cost": 11500, "sale": 16000, "min": 30, "max": 200, "reorder": 60, "stock": 75, "loc": "Pasillo H-1"},
            
            # Granos
            {"sku": "GRA-FRI-003", "name": "Frijol Bola Roja Seleccionado 500g", "category": "Granos", "unit": "und", "cost": 3800, "sale": 5000, "min": 40, "max": 300, "reorder": 80, "stock": 150, "loc": "Pasillo B-1"},
            {"sku": "GRA-LEN-004", "name": "Lenteja Importada Seleccionada 500g", "category": "Granos", "unit": "und", "cost": 2200, "sale": 3000, "min": 40, "max": 300, "reorder": 80, "stock": 45, "loc": "Pasillo B-2"},
            
            # Lácteos
            {"sku": "LAC-LEC-009", "name": "Leche Entera Alquería Bolsa 1L", "category": "Lácteos", "unit": "litro", "cost": 3100, "sale": 4200, "min": 100, "max": 800, "reorder": 200, "stock": 250, "loc": "Nevera 1"},
            {"sku": "LAC-QUE-010", "name": "Queso Doble Crema Colanta 500g", "category": "Lácteos", "unit": "und", "cost": 7500, "sale": 10500, "min": 15, "max": 100, "reorder": 30, "stock": 12, "loc": "Nevera 2"},  # Stock bajo!
            {"sku": "LAC-MAN-011", "name": "Mantequilla con Sal Colanta 250g", "category": "Lácteos", "unit": "und", "cost": 3800, "sale": 5200, "min": 25, "max": 200, "reorder": 50, "stock": 68, "loc": "Nevera 2"},
            
            # Limpieza
            {"sku": "LIM-JAB-016", "name": "Jabón Rey Azul Barra Tradicional 300g", "category": "Limpieza", "unit": "und", "cost": 1500, "sale": 2200, "min": 80, "max": 600, "reorder": 150, "stock": 180, "loc": "Pasillo D-1"},
            {"sku": "LIM-DET-017", "name": "Detergente en Polvo Fab Floral 1kg", "category": "Limpieza", "unit": "kg", "cost": 5800, "sale": 8200, "min": 40, "max": 300, "reorder": 80, "stock": 92, "loc": "Pasillo D-2"},
            {"sku": "LIM-LAV-018", "name": "Lavaloza en Crema Axion Limón 400g", "category": "Limpieza", "unit": "und", "cost": 4200, "sale": 5900, "min": 30, "max": 250, "reorder": 60, "stock": 88, "loc": "Pasillo D-3"},
            {"sku": "LIM-CLO-019", "name": "Cloro Desinfectante Límpido 1L", "category": "Limpieza", "unit": "litro", "cost": 2100, "sale": 3200, "min": 50, "max": 400, "reorder": 100, "stock": 115, "loc": "Pasillo D-4"},
            {"sku": "LIM-SUA-020", "name": "Suavizante Soflan Primavera 1L", "category": "Limpieza", "unit": "litro", "cost": 6200, "sale": 8900, "min": 20, "max": 150, "reorder": 45, "stock": 58, "loc": "Pasillo D-5"},
            {"sku": "LIM-PAP-021", "name": "Papel Higiénico Familia Acolchado x4", "category": "Limpieza", "unit": "und", "cost": 4500, "sale": 6200, "min": 40, "max": 300, "reorder": 80, "stock": 105, "loc": "Pasillo E-1"},
            {"sku": "LIM-SER-022", "name": "Servilletas Familia Hojas Dobles x100", "category": "Limpieza", "unit": "und", "cost": 1800, "sale": 2600, "min": 30, "max": 200, "reorder": 60, "stock": 74, "loc": "Pasillo E-2"},
            
            # Bebidas
            {"sku": "BEB-GAS-023", "name": "Gaseosa Coca-Cola Original 1.5L", "category": "Bebidas", "unit": "und", "cost": 3800, "sale": 5000, "min": 100, "max": 600, "reorder": 200, "stock": 240, "loc": "Pasillo F-1"},
            {"sku": "BEB-AGU-024", "name": "Agua Mineral Cristal Sin Gas 600ml", "category": "Bebidas", "unit": "und", "cost": 900, "sale": 1500, "min": 150, "max": 1000, "reorder": 300, "stock": 420, "loc": "Pasillo F-2"},
            {"sku": "BEB-JUG-025", "name": "Jugo Hit Sabor Naranja Doypack 1L", "category": "Bebidas", "unit": "und", "cost": 2400, "sale": 3500, "min": 50, "max": 350, "reorder": 100, "stock": 135, "loc": "Pasillo F-3"},
            {"sku": "BEB-CER-026", "name": "Cerveza Club Colombia Dorada Lata", "category": "Bebidas", "unit": "und", "cost": 2200, "sale": 3200, "min": 120, "max": 1200, "reorder": 240, "stock": 310, "loc": "Pasillo F-4"},
        ]

        for p_data in productos_data:
            p = Product(
                company_id="dev-company-id",
                sku=p_data["sku"],
                name=p_data["name"],
                category=p_data["category"],
                unit=p_data["unit"],
                cost_price=p_data["cost"],
                sale_price=p_data["sale"],
                min_stock=p_data["min"],
                max_stock=p_data["max"],
                reorder_point=p_data["reorder"],
                is_active=True
            )
            session.add(p)
            await session.flush() # Para generar el ID único del producto

            # Crear inventario correspondiente
            inv = Inventory(
                product_id=p.id,
                company_id="dev-company-id",
                current_stock=p_data["stock"],
                location=p_data["loc"]
            )
            session.add(inv)

        await session.commit()
        print("30 Productos de prueba sembrados exitosamente.")

if __name__ == "__main__":
    asyncio.run(seed())
