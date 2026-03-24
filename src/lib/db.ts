import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  getDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Product } from '../types';

const PRODUCTS_COLLECTION = 'products';
const SETTINGS_COLLECTION = 'settings';
const GLOBAL_SETTINGS_DOC = 'global';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}

export const saveProducts = async (products: Product[]): Promise<void> => {
  try {
    // In Firestore, we usually save individually or in batches.
    // For simplicity, we'll save each product.
    const promises = products.map(product => 
      setDoc(doc(db, PRODUCTS_COLLECTION, product.id), product)
    );
    await Promise.all(promises);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PRODUCTS_COLLECTION);
  }
};

export const saveProduct = async (product: Product): Promise<void> => {
  try {
    await setDoc(doc(db, PRODUCTS_COLLECTION, product.id), product);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PRODUCTS_COLLECTION}/${product.id}`);
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, PRODUCTS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PRODUCTS_COLLECTION}/${id}`);
  }
};

export const loadProducts = async (): Promise<Product[]> => {
  try {
    const q = query(collection(db, PRODUCTS_COLLECTION));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Product);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PRODUCTS_COLLECTION);
    return [];
  }
};

export const subscribeToProducts = (callback: (products: Product[]) => void) => {
  const q = query(collection(db, PRODUCTS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(doc => doc.data() as Product);
    callback(products);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, PRODUCTS_COLLECTION);
  });
};

export const saveLogo = async (logoBase64: string): Promise<void> => {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, GLOBAL_SETTINGS_DOC), { logo: logoBase64 }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${GLOBAL_SETTINGS_DOC}`);
  }
};

export const loadLogo = async (): Promise<string | null> => {
  try {
    const docSnap = await getDoc(doc(db, SETTINGS_COLLECTION, GLOBAL_SETTINGS_DOC));
    if (docSnap.exists()) {
      return docSnap.data().logo || null;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${SETTINGS_COLLECTION}/${GLOBAL_SETTINGS_DOC}`);
    return null;
  }
};

export const subscribeToLogo = (callback: (logo: string | null) => void) => {
  return onSnapshot(doc(db, SETTINGS_COLLECTION, GLOBAL_SETTINGS_DOC), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().logo || null);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `${SETTINGS_COLLECTION}/${GLOBAL_SETTINGS_DOC}`);
  });
};
