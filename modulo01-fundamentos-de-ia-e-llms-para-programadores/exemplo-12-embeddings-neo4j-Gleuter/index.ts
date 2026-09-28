import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { DocumentProcessor } from './documentProcessor.ts';
import { CONFIG } from './config.ts';
import { type PretrainedOptions } from "@huggingface/transformers";
import { NEO4JVectorStore } from "langchain/vectorstores/neo4j";

let _neo4jVectorStore =null;

try {
    console.log("🚀 Inicializando sistema de Embeddings com Neo4j...\n");

    const documentPrecessor = new DocumentProcessor(
        CONFIG.pdf.path,
        CONFIG.textSplitter
    );

    const documents = await documentPrecessor.loadAndSplit();
    //console.log(documents);
    const embeddings = new HuggingFaceTransformersEmbeddings({
        model: CONFIG.embedding.modelName,
        pretrainedOptions: CONFIG.embedding.pretrainedOptions as PretrainedOptions
    });

    //  const response = await embeddings.embedQuery(
    //    "JavaScript"
    //)

    //const response = await embeddings.embedDocuments(
    //  ["Javascript"]
    //)

    //  console.log('response', response)

    _neo4jVectorStore = NEO4JVectorStore.fromExistingGraph({
        embeddings,
        CONFIG.neo4j
    })

} catch (error) {
    console.error('Error occurred:', error);
}finally {
    // _neo4jVectorStore
}