import pandas as pd


class DatasetPreprocessing:

    def normalize_columns(self, df):

        column_mapping = {
            'title': 'food_name',
            'nama_makanan': 'food_name',
            'bahan': 'ingredients'
        }

        df = df.rename(columns=column_mapping)

        return df


    def clean_text(self, df):

        df['food_name'] = df['food_name'].str.lower()

        return df