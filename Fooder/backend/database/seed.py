import pandas as pd
from database.db import SessionLocal
from database.models import Food

session = SessionLocal()


df = pd.read_csv("datasets/food_dataset.csv")

for _, row in df.iterrows():
    food = Food(
        food_name=row["food_name"],
        ingredients=row["ingredients"]
    )

    session.add(food)

session.commit()
session.close()

print("Dataset inserted successfully")