export interface CatalogItem {
    id: number;
    name: string;
    description: string;
    price: number;
    image: string;
}

export interface CartItem {
    id: number;
    quantity: number;
}
