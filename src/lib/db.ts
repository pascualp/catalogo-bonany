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
  getDocFromServer,
  writeBatch
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
    // Firestore has a limit of 500 operations per batch.
    // We'll process in chunks of 100 to be conservative and avoid exhausting the write stream.
    const chunkSize = 100;
    for (let i = 0; i < products.length; i += chunkSize) {
      const chunk = products.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      
      chunk.forEach(product => {
        const docId = String(product.id);
        const docRef = doc(db, PRODUCTS_COLLECTION, docId);
        batch.set(docRef, {
          ...product,
          id: docId
        });
      });
      
      await batch.commit();
      
      // Small delay to prevent overloading the SDK's write stream
      if (i + chunkSize < products.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PRODUCTS_COLLECTION);
  }
};

export const deleteProducts = async (productIds: string[]): Promise<void> => {
  try {
    const chunkSize = 100;
    for (let i = 0; i < productIds.length; i += chunkSize) {
      const chunk = productIds.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      
      chunk.forEach(id => {
        const docRef = doc(db, PRODUCTS_COLLECTION, id);
        batch.delete(docRef);
      });
      
      await batch.commit();
      
      if (i + chunkSize < productIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, PRODUCTS_COLLECTION);
  }
};

export const saveProduct = async (product: Product): Promise<void> => {
  try {
    const docId = String(product.id);
    await setDoc(doc(db, PRODUCTS_COLLECTION, docId), {
      ...product,
      id: docId
    });
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
